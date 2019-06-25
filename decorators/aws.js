// Exports a factory function
module.exports = (decorator) => {
  const { awsPlotter, awsDataStore, dir } = decorator;
  const { decorate } = decorator;

  decorator.decorate = () => {
    decorate();

    // Main process
    awsPlotter.attachAwsResources({
      instances: awsDataStore.getInstances(dir),
      subnets: awsDataStore.getSubnets(dir),
      vpcs: awsDataStore.getVpcs(dir),
    });
  };

  return decorator;
};
