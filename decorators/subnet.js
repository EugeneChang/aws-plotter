// Exports a factory function
module.exports = (decorator, match) => {
  const { awsPlotter, awsDataStore, dir } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    const subnets = awsDataStore.getSubnets(dir);
    subnets.forEach((subnet) => {
      const name = awsPlotter.getNameFromTags(subnet.Tags);
      if (!match({ input: name })) {
        return;
      }

      awsPlotter.addPseudoNode({ parent: { id: subnet.SubnetId, classes: 'subnet' } });
    });
  };

  return decorator;
};
