const awsJsonReader = require('../aws-json-reader')();
const dnsUtil = require('../dns-util');

const { appendValueToMap, formatDns } = dnsUtil;

// Exports a factory function
module.exports = (decorator, match) => {
  const {
    awsPlotter, awsDataStore, dir, aliasDnsXSourceNodeIds = {},
  } = decorator;

  // Nodes with same DNS
  const dnsXNodeIds = {};

  function processElbs({ regionDir }) {
    const obj = awsJsonReader['elb-describe-load-balancers'](regionDir);
    obj.LoadBalancerDescriptions.forEach((loadBalancer) => {
      const dns = formatDns(loadBalancer.DNSName);
      if (!match({ input: dns }) && !Object.prototype.hasOwnProperty.call(aliasDnsXSourceNodeIds, dns)) {
        return;
      }

      const loadBalancerName = loadBalancer.LoadBalancerName;
      loadBalancer.Subnets.forEach((subnetId) => {
        const nodeId = `${loadBalancerName}-${subnetId}`;
        awsPlotter.addNode({
          id: nodeId,
          label: loadBalancerName,
          classes: 'elb',
          parent: { id: subnetId, classes: 'subnet' },
        });

        appendValueToMap(dnsXNodeIds, dns, nodeId);

        // Links elb with instances
        if (loadBalancer.Instances) {
          loadBalancer.Instances.forEach(i => awsPlotter.addEdge({ source: nodeId, target: i.InstanceId }));
        }
      });
    });
  }

  function processElbv2s({ regionDir }) {
    const obj = awsJsonReader['elbv2-describe-load-balancers'](regionDir);
    obj.LoadBalancers.forEach((loadBalancer) => {
      const dns = formatDns(loadBalancer.DNSName);
      if (!match({ input: dns }) && !Object.prototype.hasOwnProperty.call(aliasDnsXSourceNodeIds, dns)) {
        return;
      }

      const loadBalancerName = loadBalancer.LoadBalancerName;
      loadBalancer.AvailabilityZones.forEach((subnet) => {
        const subnetId = subnet.SubnetId;
        const nodeId = `${loadBalancerName}-${subnetId}`;
        awsPlotter.addNode({
          id: nodeId,
          label: loadBalancerName,
          classes: `elbv2-${loadBalancer.Type}`,
          parent: { id: subnetId, classes: 'subnet' },
        });

        appendValueToMap(dnsXNodeIds, dns, nodeId);

        const objTargetGroups = awsJsonReader['elbv2-describe-target-groups'](regionDir);
        // Link elbv2 with instances using target groups
        objTargetGroups.TargetGroups.forEach((tg) => {
          if (tg.LoadBalancerArns.includes(loadBalancer.LoadBalancerArn)) {
            const objTargetHealth = awsJsonReader['elbv2-describe-target-health'](regionDir, tg.TargetGroupArn);
            objTargetHealth.TargetHealthDescriptions.forEach(t => awsPlotter.addEdge({ source: nodeId, target: t.Target.Id }));
          }
        });
      });
    });
  }

  function linkAliasDnsAndDns() {
    Object.keys(aliasDnsXSourceNodeIds)
      .forEach(aliasDns => aliasDnsXSourceNodeIds[aliasDns]
        .forEach((sourceNodeId) => {
          const nodeIds = dnsXNodeIds[aliasDns];
          if (nodeIds) {
            nodeIds.forEach(targetNodeId => awsPlotter.addEdge({ source: sourceNodeId, target: targetNodeId }));
          }
        }));
  }

  function plotRegionElbs({ region }) {
    const regionDir = `${dir + region}/`;
    processElbs({ regionDir });
    processElbv2s({ regionDir });
  }

  const { decorate } = decorator;
  decorator.decorate = () => {
    decorate();

    // Main process
    awsDataStore.getRegions(dir).forEach(region => plotRegionElbs({ dir, region, match }));
    linkAliasDnsAndDns();
  };

  return decorator;
};
