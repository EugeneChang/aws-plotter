const fs = require('fs');
const express = require('express');
const argv = require('minimist')(process.argv.slice(2));
const awsJsonCollector = require('./aws-json-collector');
const awsPlotter = require('./aws-plotter')();
const awsDataStore = require('./aws-data-store')();
const awsDecorator = require('./decorators/aws');
const elbDecorator = require('./decorators/elb');
const instanceDecorator = require('./decorators/instance');
const natGatewayDecorator = require('./decorators/nat-gateway');
const rdsDecorator = require('./decorators/rds');
const route53Decorator = require('./decorators/route53');
const subnetDecorator = require('./decorators/subnet');

// Command
const command = argv._[0];

// Options
const { port = 8888 } = argv;
let { dir } = argv;
dir = dir && (dir.endsWith('/') ? dir : (`${dir}/`));

const decoratorFn = (decorator, resourceRegex) => decoratee => decorator(decoratee, ({ input }) => {
  const regex = argv[resourceRegex] || argv.regex;
  if (regex) {
    return input && input.match(regex);
  }
  return true;
});

const decorators = {
  aws: decoratorFn(awsDecorator),
  elb: decoratorFn(elbDecorator, 'elb-regex'),
  instance: decoratorFn(instanceDecorator, 'instance-regex'),
  'nat-gateway': decoratorFn(natGatewayDecorator, 'nat-gateway-regex'),
  rds: decoratorFn(rdsDecorator, 'rds-regex'),
  route53: decoratorFn(route53Decorator, 'route53-regex'),
  subnet: decoratorFn(subnetDecorator, 'subnet-regex'),
};

const commands = {
  collect: () => awsJsonCollector.collect(dir),
  plot: () => {
    // Remove elb, rds if route53 exists
    const excludes = ['elb', 'rds'];
    let types = [].concat(argv.type).concat('aws');
    types = types.includes('route53') ? types.filter(s => !excludes.includes(s)) : types;

    let decorator = {
      awsPlotter,
      awsDataStore,
      dir,
      decorate: () => console.log('Start decorating....'),
    };

    // Decorate each type
    decorator = types.reduce((accumulator, type) => {
      console.log(`Decorating ${type}....`);
      return decorators[type](accumulator);
    }, decorator);

    decorator.decorate();

    const elements = awsPlotter.getElements();
    console.log('Nodes:', elements.nodes.length, 'Edges:', elements.edges.length);

    // Add classes to each node
    elements.nodes.forEach((node) => {
      node.classes += ' bottom-center';
    });

    // Generate elements.json
    const s = JSON.stringify(elements, null, 2);
    fs.writeFile('web/elements.json', s, err => (err ? console.log(err) : null));
  },
  serve: () => {
    const app = express();
    app.use(express.static('web'));
    app.listen(port, () => console.log(`http://localhost:${port}`));
  },
};

commands[command]();
