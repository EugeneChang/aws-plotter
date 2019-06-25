// Exports a factory function
module.exports = (decorator, match) => {
  const { awsPlotter, awsDataStore, dir } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    const pseudoNode = awsPlotter.addPseudoNode({ parent: { id: 'aws', classes: 'aws' } });
    const instances = awsDataStore.getInstances(dir);
    instances.forEach((instance) => {
      const name = awsPlotter.getNameFromTags(instance.Tags);
      if (!match({ input: name })) {
        return;
      }
      awsPlotter.addEdge({ source: pseudoNode.data.id, target: instance.InstanceId });
    });
  };

  return decorator;
};
