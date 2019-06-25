// Exports a factory function
module.exports = (decorator, match) => {
  const { awsPlotter, awsDataStore, dir } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    const natGateways = awsDataStore.getNatGateways(dir);
    if (natGateways) {
      natGateways.forEach((natGateway) => {
        const name = awsPlotter.getNameFromTags(natGateway.Tags);
        if (!match({ input: name })) {
          return;
        }
        const natGatewayId = natGateway.NatGatewayId;
        awsPlotter.addNode({
          id: natGatewayId,
          label: name || natGatewayId,
          classes: 'nat-gateway',
          parent: { id: natGateway.SubnetId, classes: 'subnet' },
        });
      });
    }
  };

  return decorator;
};
