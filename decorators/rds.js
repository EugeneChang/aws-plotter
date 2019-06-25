// Exports a factory function
module.exports = (decorator, match) => {
  const {
    awsPlotter, awsDataStore, dir, aliasDnsXSourceNodeIds = {},
  } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    const rdss = awsDataStore.getRdss(dir);
    rdss.forEach((rds) => {
      const dbId = rds.DBInstanceIdentifier;
      const sourceNodeIds = aliasDnsXSourceNodeIds[rds.Endpoint.Address];
      if (!match({ input: dbId }) && !sourceNodeIds) {
        return;
      }
      const dbSubnetGroup = rds.DBSubnetGroup;
      dbSubnetGroup.Subnets.forEach((subnet) => {
        const subnetId = subnet.SubnetIdentifier;
        const rdsId = `${dbId}-${subnetId}`;

        awsPlotter.addNode({
          id: rdsId,
          label: dbId,
          classes: 'rds',
          parent: { id: subnet.SubnetIdentifier, classes: 'subnet' },
        });

        if (sourceNodeIds) {
          sourceNodeIds.forEach(sourceNodeId => awsPlotter.addEdge({ source: sourceNodeId, target: rdsId }));
        }
      });
    });
  };

  return decorator;
};
