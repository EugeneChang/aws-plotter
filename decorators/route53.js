const awsJsonReader = require('../aws-json-reader')();
const elbDecorator = require('../decorators/elb');
const rdsDecorator = require('../decorators/rds');
const dnsUtil = require('../dns-util');

const { appendValueToMap, formatDns } = dnsUtil;

// Exports a factory function
module.exports = (decorator, match) => {
  // Source nodes using alias DNS
  const aliasDnsXSourceNodeIds = {};
  decorator.aliasDnsXSourceNodeIds = aliasDnsXSourceNodeIds;
  const { awsPlotter, awsDataStore, dir } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    function processRoute53s() {
      const obj = awsJsonReader['route53-list-hosted-zones'](dir);
      obj.HostedZones.forEach((hostedZone) => {
        const resourceRecordSets = awsJsonReader['route53-list-resource-record-sets'](dir, hostedZone.Id);
        resourceRecordSets.ResourceRecordSets.forEach((resourceRecordSet) => {
          const dns = formatDns(resourceRecordSet.Name);
          if (!match({ input: dns })) {
            return;
          }
          if (resourceRecordSet.Type === 'A') {
            const nodeId = dns;
            awsPlotter.addNode({
              id: nodeId,
              label: dns,
              classes: `resource-record-set${hostedZone.Config.PrivateZone ? '-private' : ''}`,
              parent: { id: 'aws' },
            });

            // Use alias target. Target nodeIds unknown, keep relationship first
            const aliasTarget = resourceRecordSet.AliasTarget;
            if (aliasTarget) {
              appendValueToMap(aliasDnsXSourceNodeIds, formatDns(aliasTarget.DNSName), nodeId);
            }

            // Use resource records. Add edge directly using instanceId
            const resourceRecords = resourceRecordSet.ResourceRecords;
            if (resourceRecords) {
              resourceRecords.forEach((resourceRecord) => {
                const ip = resourceRecord.Value;
                const instanceId = awsDataStore.getInstanceIdByIp({ dir, ip }) || ip;
                awsPlotter.addEdge({ source: nodeId, target: instanceId });
              });
            }
          } else if (resourceRecordSet.Type === 'CNAME') {
            const nodeId = dns;
            awsPlotter.addNode({
              id: nodeId,
              label: dns,
              classes: `resource-record-set${hostedZone.Config.PrivateZone ? '-private' : ''}`,
              parent: { id: 'aws' },
            });

            // Use resource records. Add edge directly using dns
            const resourceRecords = resourceRecordSet.ResourceRecords;
            if (resourceRecords) {
              resourceRecords.forEach((resourceRecord) => {
                appendValueToMap(aliasDnsXSourceNodeIds, formatDns(resourceRecord.Value), nodeId);
              });
            }
          }
        });
      });
    }

    // Main process
    processRoute53s({ dir, match });
  };

  // Decorate elbs, rds
  return rdsDecorator(elbDecorator(decorator, match), match);
};
