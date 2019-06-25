/* global it, describe */
const { expect } = require('chai');
const createAwsPlotter = require('../aws-plotter');

const expectNodeClasses = (elements, classes, length) => expect(elements.nodes.filter(node => node.classes === classes).length).to.eq(length);
const instances = [{ InstanceId: 'i-1', SubnetId: 'subnet-1' }];
const subnets = [{
  AvailabilityZone: 'us-west-2a',
  AvailabilityZoneId: 'usw2-az1',
  CidrBlock: '10.0.1.0/24',
  SubnetId: 'subnet-1',
  VpcId: 'vpc-1',
  Tags: [{ Key: 'Name', Value: 'test-subnet' }],
}];
const vpcs = [{
  CidrBlock: '10.0.0.0/16',
  VpcId: 'vpc-1',
  Tags: [{ Key: 'Name', Value: 'test-vpc' }],
  region: 'us-west-2',
}];

describe('aws-plotter', () => {
  describe('getNextCount', () => {
    it('should increment count', () => {
      const awsPlotter = createAwsPlotter();
      expect(awsPlotter.addEdge({ source: 'A', target: 'B' }).data.id).to.eq('edge-1');
      expect(awsPlotter.addEdge({ source: 'A', target: 'C' }).data.id).to.eq('edge-2');
    });
  });

  describe('getElements', () => {
    it('should return elemets', () => {
      const awsPlotter = createAwsPlotter();
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(0);
      expect(elements.edges.length).to.eq(0);
    });
  });

  describe('addEdge', () => {
    it('should add an edge w/o label', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'B' });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(0);
      expect(elements.edges.length).to.eq(1);
      expect(elements.edges.filter(edge => !!edge.data.label).length).to.eq(0);
    });

    it('should add an edge w label', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'B', label: 'link' });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(0);
      expect(elements.edges.length).to.eq(1);
      expect(elements.edges.filter(edge => !!edge.data.label).length).to.eq(1);
    });
  });

  describe('addPhantomNode', () => {
    it('should add an edge w/o label', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'B' });
      awsPlotter.attachAwsResources();
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(2);
      expect(elements.edges.length).to.eq(1);
      expectNodeClasses(elements, 'phantom', 2);
    });
  });

  describe('addNode', () => {
    it('should add an node w/o parent', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addNode({ id: 'A', label: 'A' });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(1);
      expect(elements.edges.length).to.eq(0);
      expect(elements.nodes.filter(node => !!node.data.parent).length).to.eq(0);
    });

    it('should add an node w parentId', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addNode({ id: 'B', label: 'B', parentId: 'A' });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(1);
      expect(elements.edges.length).to.eq(0);
      expect(elements.nodes.filter(node => !!node.data.parent).length).to.eq(1);
    });

    it('should add an node w parent', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addNode({ id: 'B', label: 'B', parent: { id: 'A' } });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(1);
      expect(elements.edges.length).to.eq(0);
      expect(elements.nodes.filter(node => !!node.data.parent).length).to.eq(1);
    });
  });

  describe('attachInstances', () => {
    it('should attach instances', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'i-1' });
      awsPlotter.attachAwsResources({ instances });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(3);
      expectNodeClasses(elements, 'ec2', 1);
      expectNodeClasses(elements, 'subnet', 1);
      // A is phantom
      expectNodeClasses(elements, 'phantom', 1);
      expect(elements.edges.length).to.eq(1);
    });
  });

  describe('attachSubnets', () => {
    it('should attach subnets', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'i-1' });
      awsPlotter.attachAwsResources({ instances, subnets });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(5);
      expectNodeClasses(elements, 'ec2', 1);
      expectNodeClasses(elements, 'subnet', 1);
      expectNodeClasses(elements, 'vpc-az', 1);
      expectNodeClasses(elements, 'vpc', 1);
      // A is phantom
      expectNodeClasses(elements, 'phantom', 1);
      expect(elements.edges.length).to.eq(1);
    });
  });

  describe('attachVpcs', () => {
    it('should attach vpcs', () => {
      const awsPlotter = createAwsPlotter();
      awsPlotter.addEdge({ source: 'A', target: 'i-1' });
      awsPlotter.attachAwsResources({ instances, subnets, vpcs });
      const elements = awsPlotter.getElements();
      expect(elements.nodes.length).to.eq(7);
      expectNodeClasses(elements, 'ec2', 1);
      expectNodeClasses(elements, 'subnet', 1);
      expectNodeClasses(elements, 'vpc-az', 1);
      expectNodeClasses(elements, 'vpc', 1);
      expectNodeClasses(elements, 'region', 1);
      expectNodeClasses(elements, 'aws', 1);
      // A is phantom
      expectNodeClasses(elements, 'phantom', 1);
      expect(elements.edges.length).to.eq(1);
    });
  });
});
