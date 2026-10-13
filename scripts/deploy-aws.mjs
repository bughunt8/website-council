import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN = "council.profitriseco.com";
const aws = (args) => execFileSync("aws", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const json = (args) => JSON.parse(aws([...args, "--output", "json"]));

export function validateTargets({ account, identityArn, region, role, bucket, distributionId, siteUrl, distribution, tags, branch }) {
  assert.equal(branch, "main", "AWS production deploy requires main");
  assert.match(account, /^\d{12}$/, "Expected AWS account ID");
  assert.match(region, /^[a-z]{2}-[a-z]+-\d$/, "Expected AWS region");
  assert.equal(role, `arn:aws:iam::${account}:role/website-council-production-deploy`, "Unexpected deployment role");
  assert.match(identityArn, new RegExp(`^arn:aws:sts::${account}:assumed-role/website-council-production-deploy/[^/]+$`), "Caller is not the scoped deployment role");
  assert.equal(bucket, `website-council-production-${account}-${region}`, "Refusing a shared or unrelated bucket");
  assert.match(distributionId, /^[A-Z0-9]{8,32}$/, "Expected CloudFront distribution ID");
  assert.equal(distribution.Id, distributionId, "Wrong distribution");
  assert.equal(distribution.DistributionConfig.Comment, "website-council/production", "Refusing an unrelated distribution");
  assert.equal(distribution.Status, "Deployed", "CloudFront infrastructure is not ready");
  assert.equal(siteUrl, `https://${distribution.DomainName}`, "Verification host must be the exact distribution host");
  assert.match(distribution.DomainName, /^[a-z0-9]+\.cloudfront\.net$/);
  assert.equal(tags.find((t) => t.Key === "Application")?.Value, "website-council", "Bucket not tagged as Council");
  assert.equal(tags.find((t) => t.Key === "Environment")?.Value, "production", "Wrong bucket environment");
  const origins = distribution.DistributionConfig.Origins.Items;
  assert.equal(origins.length, 1, "Unexpected origin count");
  assert.equal(origins[0].Id, "council-s3");
  assert.equal(origins[0].DomainName, `${bucket}.s3.${region}.amazonaws.com`, "Distribution origin is not the Council bucket");
  assert.ok(origins[0].OriginAccessControlId, "Private S3 origin requires OAC");
  assert.equal(origins[0].OriginPath || "", "", "Unexpected origin prefix");
}

export function uploadPlan(bucket, dir = path.join(ROOT, "dist")) {
  assert.match(bucket, /^website-council-production-\d{12}-[a-z]{2}-[a-z]+-\d$/);
  return [
    ["s3", "sync", dir, `s3://${bucket}/`, "--exclude", "*.html", "--exclude", "release.json", "--exclude", "data/*", "--exclude", "_headers", "--cache-control", "public,max-age=86400,must-revalidate"],
    ["s3", "sync", path.join(dir, "data"), `s3://${bucket}/data/`, "--cache-control", "public,max-age=0,must-revalidate"],
    ["s3", "cp", path.join(dir, "index.html"), `s3://${bucket}/index.html`, "--content-type", "text/html; charset=utf-8", "--cache-control", "public,max-age=0,must-revalidate"],
    ["s3", "cp", path.join(dir, "release.json"), `s3://${bucket}/release.json`, "--content-type", "application/json", "--cache-control", "no-store"],
  ];
}

async function verify(base, revision) {
  for (let i = 0; i < 18; i++) {
    try {
      const response = await fetch(`${base}/release.json?revision=${revision}`, { signal: AbortSignal.timeout(10000) });
      const release = await response.json();
      if (response.ok && release.revision === revision && release.mode === "public-static-viewer" && release.canonicalHost === DOMAIN && release.environment === "production") return;
    } catch {}
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error(`${base} is not serving the exact approved revision`);
}

export async function deploy() {
  const env = process.env;
  for (const key of ["AWS_REGION", "AWS_ROLE_ARN", "S3_BUCKET", "CLOUDFRONT_DISTRIBUTION_ID", "AWS_SITE_URL"]) assert.ok(env[key], `Missing production variable ${key}`);
  const branch = env.GITHUB_REF ? env.GITHUB_REF.replace("refs/heads/", "") : execFileSync("git", ["-C", ROOT, "branch", "--show-current"], { encoding: "utf8" }).trim();
  assert.equal(branch, "main", "Production requires main");
  assert.equal(execFileSync("git", ["-C", ROOT, "status", "--porcelain"], { encoding: "utf8" }).trim(), "", "Refusing uncommitted production source");
  assert.notEqual(env.COUNCIL_STAGING, "1", "Refusing to deploy a staging build to production");
  const release = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/release.json"), "utf8"));
  const sha = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.equal(release.revision, env.GITHUB_SHA || sha, "Build is not from the checked-out commit");
  assert.equal(release.canonicalHost, DOMAIN, "Build targets the wrong hostname");
  assert.equal(release.environment, "production", "Refusing preview/staging output in production");
  for (const file of ["index.html", "app.js", "styles.css", "release.json", "data/catalog.json"]) assert.ok(fs.existsSync(path.join(ROOT, "dist", file)), `Missing public output ${file}`);
  const identity = json(["sts", "get-caller-identity"]);
  const distribution = json(["cloudfront", "get-distribution", "--id", env.CLOUDFRONT_DISTRIBUTION_ID]).Distribution;
  const tags = json(["s3api", "get-bucket-tagging", "--bucket", env.S3_BUCKET]).TagSet;
  validateTargets({ account: identity.Account, identityArn: identity.Arn, region: env.AWS_REGION, role: env.AWS_ROLE_ARN, bucket: env.S3_BUCKET, distributionId: env.CLOUDFRONT_DISTRIBUTION_ID, siteUrl: env.AWS_SITE_URL, distribution, tags, branch });
  for (const args of uploadPlan(env.S3_BUCKET)) aws(args);
  const invalidation = json(["cloudfront", "create-invalidation", "--distribution-id", env.CLOUDFRONT_DISTRIBUTION_ID, "--paths", "/*"]).Invalidation.Id;
  aws(["cloudfront", "wait", "invalidation-completed", "--distribution-id", env.CLOUDFRONT_DISTRIBUTION_ID, "--id", invalidation]);
  await verify(env.AWS_SITE_URL, release.revision);
  if (env.CUSTOM_DOMAIN_ACTIVE === "true") await verify(`https://${DOMAIN}`, release.revision);
  console.log("AWS distribution serves the exact Council revision. Custom-domain qualification remains separate unless enabled.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await deploy(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
