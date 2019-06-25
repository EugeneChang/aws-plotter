const { execSync } = require('child_process');
const awsJsonReader = require('./aws-json-reader')();

const executeCommand = (c) => {
  console.log('Running....', c);
  execSync(c);
};
function runTask(task) {
  if (task.command) {
    executeCommand(task.command);
  }
  if (task.commandsFn) {
    const commands = task.commandsFn();
    if (commands) {
      commands.forEach(command => executeCommand(command));
    }
  }
  if (task.fn) {
    task.fn();
  }
}

function runTasks(tasks) {
  tasks.forEach(task => runTask(task));
}

function collectRegion(dir, region) {
  const regionDir = `${dir + region}/`;
  const regionMkdir = s => `mkdir -p ${regionDir}${s}`;
  const regionAws = (resource, command) => `aws ${resource} ${command} --region ${region} --no-paginate > ${regionDir}${resource}-${command}.json`;
  const regionCollections = (resource, command, source, propertyName, optionName, optionValue) => awsJsonReader[source](regionDir)[propertyName].map((obj) => {
    const value = obj[optionValue];
    return `aws ${resource} ${command} --region ${region} --${optionName} ${value} > ${regionDir}${resource}-${command}/${encodeURIComponent(value)}.json`;
  });
  const tasks = [
    { command: regionMkdir('') },
    { command: regionAws('ec2', 'describe-instances') },
    { command: regionAws('ec2', 'describe-nat-gateways') },
    { command: regionAws('ec2', 'describe-subnets') },
    { command: regionAws('ec2', 'describe-vpcs') },
    { command: regionAws('elb', 'describe-load-balancers') },
    { command: regionAws('elbv2', 'describe-load-balancers') },
    { command: regionMkdir('elbv2-describe-target-health') },
    { command: regionAws('elbv2', 'describe-target-groups') },
    { commandsFn: () => regionCollections('elbv2', 'describe-target-health', 'elbv2-describe-target-groups', 'TargetGroups', 'target-group-arn', 'TargetGroupArn') },
    { command: regionAws('rds', 'describe-db-instances') },
  ];

  runTasks(tasks);
}

function collect(dir) {
  if (!dir) {
    console.error('Directory required');
    return;
  }
  const mkdir = s => `mkdir -p ${dir}${s}`;
  const aws = (resource, command, noPaginate) => `aws ${resource} ${command}${noPaginate ? ' --no-paginate' : ''} > ${dir}${resource}-${command}.json`;
  const collections = (resource, command, source, propertyName, optionName, optionValue) => awsJsonReader[source](dir)[propertyName].map((obj) => {
    const value = obj[optionValue];
    return `aws ${resource} ${command} --${optionName} ${value} > ${dir}${resource}-${command}/${encodeURIComponent(value)}.json`;
  });
  const tasks = [
    { command: mkdir('') },
    {
      command: aws('ec2', 'describe-regions', false),
      fn: () => {
        const obj = awsJsonReader['ec2-describe-regions'](dir);
        obj.Regions.forEach(region => collectRegion(dir, region.RegionName));
      },
    },
    { command: mkdir('route53-list-resource-record-sets') },
    { command: aws('route53', 'list-hosted-zones', true) },
    { commandsFn: () => collections('route53', 'list-resource-record-sets', 'route53-list-hosted-zones', 'HostedZones', 'hosted-zone-id', 'Id') },
  ];

  runTasks(tasks);
}

// Exports a function
module.exports = { collect };
