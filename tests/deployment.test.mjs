import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { uploadPlan, validateTargets } from "../scripts/deploy-aws.mjs";
const template = JSON.parse(fs.readFileSync("infrastructure/aws-production.json", "utf8"));
const bucket = "website-council-production-123456789012-ap-east-1";
const fixture = () => ({
  account: "123456789012", identityArn: "arn:aws:sts::123456789012:assumed-role/website-council-production-deploy/council-test", region: "ap-east-1", role: "arn:aws:iam::123456789012:role/website-council-production-deploy",
  bucket, distributionId: "E1234567890123", siteUrl: "https://d123456789.cloudfront.net", branch: "main",
  tags: [{ Key: "Application", Value: "website-council" }, { Key: "Environment", Value: "production" }],
  distribution: { Id: "E1234567890123", Status: "Deployed", DomainName: "d123456789.cloudfront.net", DistributionConfig: { Comment: "website-council/production", Origins: { Items: [{ Id: "council-s3", DomainName: `${bucket}.s3.ap-east-1.amazonaws.com`, OriginAccessControlId: "E1234", OriginPath: "" }] } } },
});
test("Cloudflare is staging-only and AWS uses OIDC production", () => {
  const pages = fs.readFileSync(".github/workflows/s2-deploy.yml", "utf8");
  const aws = fs.readFileSync(".github/workflows/s3-aws-deploy.yml", "utf8");
  assert.ok(pages.includes("Pages is staging-only"));
  assert.ok(aws.includes("id-token: write")); assert.ok(aws.includes("role-to-assume"));
  assert.ok(!aws.includes("aws-secret-access-key"));
  assert.ok(fs.readFileSync(".github/workflows/b2-production.yml", "utf8").includes("s3-aws-deploy.yml"));
});
test("production targets reject unrelated buckets, distributions, branches, and roles", () => {
  // Structural target checks do not contact AWS.
  assert.throws(() => validateTargets({ ...fixture(), bucket: "www.ronald.ng" }), /unrelated bucket/);
  assert.throws(() => validateTargets({ ...fixture(), branch: "staging" }), /requires main/);
  assert.throws(() => validateTargets({ ...fixture(), role: "arn:aws:iam::123456789012:role/admin" }), /Unexpected deployment role/);
  const f = fixture(); f.distribution.DistributionConfig.Comment = "existing-site";
  assert.throws(() => validateTargets(f), /unrelated distribution/);
});
test("the dedicated production fixture passes without contacting AWS", () => {
  assert.doesNotThrow(() => validateTargets(fixture()));
});
test("unscoped callers, unrelated origins, host overrides, and missing ownership tags are rejected", () => {
  assert.throws(() => validateTargets({ ...fixture(), identityArn: "arn:aws:iam::123456789012:user/admin" }), /scoped deployment role/);
  assert.throws(() => validateTargets({ ...fixture(), siteUrl: "https://another-site.example" }), /exact distribution host/);
  assert.throws(() => validateTargets({ ...fixture(), tags: [] }), /not tagged as Council/);
  const f = fixture(); f.distribution.DistributionConfig.Origins.Items[0].DomainName = "www.ronald.ng.s3.ap-east-1.amazonaws.com";
  assert.throws(() => validateTargets(f), /not the Council bucket/);
});
test("AWS uploads only dist, skips provider metadata, and never deletes objects", () => {
  const plan = uploadPlan(bucket, "/tmp/council/dist");
  assert.equal(plan.length, 4);
  assert.ok(plan.every((args) => !args.includes("--delete")));
  assert.ok(plan[0].includes("_headers")); assert.ok(plan[0].includes("*.html"));
  assert.ok(plan.every((args) => args.some((s) => s.startsWith("/tmp/council/dist"))));
  assert.ok(plan[3].includes("no-store"));
});
test("private AWS template scopes origin and IAM to Council", () => {
  const r = template.Resources;
  assert.equal(r.SiteBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy, true);
  assert.equal(r.SiteBucket.Properties.VersioningConfiguration.Status, "Enabled");
  assert.equal(r.OriginAccessControl.Properties.OriginAccessControlConfig.SigningBehavior, "always");
  assert.equal(r.CachePolicy.Properties.CachePolicyConfig.MinTTL, 0);
  const trust = r.DeployRole.Properties.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals;
  assert.equal(trust["token.actions.githubusercontent.com:sub"], "repo:bughunt8/website-council:environment:production");
  assert.equal(trust["token.actions.githubusercontent.com:aud"], "sts.amazonaws.com");
  const grants = r.DeployRole.Properties.Policies[0].PolicyDocument.Statement;
  assert.ok(grants.every((s) => s.Resource !== "*"));
  assert.ok(!JSON.stringify(grants).includes("DeleteObject"));
  assert.ok(JSON.stringify(r.Distribution.Properties.DistributionConfig.Aliases).includes("council.profitriseco.com"));
});
test("canonical metadata targets only the confirmed domain", () => {
  for (const p of ["site/index.html", "site/robots.txt", "site/sitemap.xml", "scripts/build.mjs", ".github/workflows/s3-aws-deploy.yml"]) {
    const t = fs.readFileSync(p, "utf8");
    assert.ok(!t.includes("council.ronald.ng")); assert.ok(!t.includes("council.profitrisco.com"));
  }
  assert.ok(fs.readFileSync("site/index.html", "utf8").includes('href="https://council.profitriseco.com/"'));
});
