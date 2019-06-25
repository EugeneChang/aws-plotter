const jsonfile = require('jsonfile');

const readJson = path => jsonfile.readFileSync(path);

// Exports a factory function
module.exports = () => {
  const fns = {};

  ['ec2-describe-instances', 'ec2-describe-nat-gateways', 'ec2-describe-regions', 'ec2-describe-subnets', 'ec2-describe-vpcs',
    'elb-describe-load-balancers', 'elbv2-describe-load-balancers', 'elbv2-describe-target-groups',
    'route53-list-hosted-zones', 'rds-describe-db-instances'].forEach((s) => {
    fns[s] = dir => readJson(`${dir}${s}.json`);
  });

  ['elbv2-describe-target-health', 'route53-list-resource-record-sets'].forEach((s) => {
    fns[s] = (dir, subDir) => readJson(`${dir}${s}/${encodeURIComponent(subDir)}.json`);
  });

  // Exposed functions
  return fns;
};
