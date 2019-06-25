const awsJsonReader = require('./aws-json-reader')();

// Exports a factory function
module.exports = () => {
  const cache = {};

  function getRegions(dir) {
    const type = 'awsRegions';
    if (!cache[type]) {
      const obj = awsJsonReader['ec2-describe-regions'](dir);
      cache[type] = obj.Regions.map(region => region.RegionName);
    }
    return cache[type];
  }

  const getResource = (type, dir, name, property) => {
    if (!cache[type]) {
      cache[type] = getRegions(dir).reduce((accumulator, region) => {
        const obj = awsJsonReader[name](`${dir + region}/`);
        return accumulator.concat(obj[property]);
      }, []);
    }
    return cache[type];
  };

  function getVpcs(dir) {
    const type = 'awsVpcs';
    if (!cache[type]) {
      cache[type] = getRegions(dir).reduce((accumulator, region) => {
        const obj = awsJsonReader['ec2-describe-vpcs'](`${dir + region}/`);
        return accumulator.concat(obj.Vpcs.map((vpc) => {
          vpc.region = region;
          return vpc;
        }));
      }, []);
    }
    return cache[type];
  }

  function getInstances(dir) {
    const type = 'awsInstances';
    if (!cache[type]) {
      cache[type] = getRegions(dir).reduce((accumulator, region) => {
        const obj = awsJsonReader['ec2-describe-instances'](`${dir + region}/`);

        // Reduce ec2s to instances
        const regionInstances = obj.Reservations.reduce((instances, reservation) => instances.concat(reservation.Instances), []);
        return accumulator.concat(regionInstances);
      }, []);
    }
    return cache[type];
  }

  // Search by private IP might not be correct if there exists instances with the same IP in account
  function getInstanceIdByIp({ dir, ip }) {
    const instances = getInstances(dir);
    if (instances) {
      const instance = instances.find((i) => {
        if (ip === i.PublicIpAddress || ip === i.PrivateIpAddress) {
          return true;
        }

        const networkInterfaces = i.NetworkInterfaces;
        if (networkInterfaces) {
          const networkInterface = networkInterfaces.find((n) => {
            if (ip === n.PrivateIpAddress) {
              return true;
            }
            const privateIpAddresses = n.PrivateIpAddresses;
            if (privateIpAddresses) {
              return !!privateIpAddresses.find(p => ip === p.PrivateIpAddress);
            }
            return false;
          });
          return !!networkInterface;
        }
        return false;
      });
      return instance && instance.InstanceId;
    }
    return null;
  }

  // Exposed functions
  return {
    getRegions,
    getInstances,
    getInstanceIdByIp,
    getNatGateways: dir => getResource('awsNatGateways', dir, 'ec2-describe-nat-gateways', 'NatGateways'),
    getVpcs,
    getSubnets: dir => getResource('awsSubnets', dir, 'ec2-describe-subnets', 'Subnets'),
    getRdss: dir => getResource('awsRdss', dir, 'rds-describe-db-instances', 'DBInstances'),
  };
};
