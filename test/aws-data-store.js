/* global it, describe */
const { expect } = require('chai');
const createAwsDataStore = require('../aws-data-store');

const dir = 'demo/';

describe('aws-data-store', () => {
  describe('getRegions', () => {
    it('should return regions', () => {
      expect(createAwsDataStore().getRegions(dir).length).to.eq(1);
    });
  });

  describe('getVpcs', () => {
    it('should return vpcs', () => {
      expect(createAwsDataStore().getVpcs(dir).length).to.eq(1);
    });
  });

  describe('getSubnets', () => {
    it('should return subnets', () => {
      expect(createAwsDataStore().getSubnets(dir).length).to.eq(4);
    });
  });

  describe('getInstances', () => {
    it('should return instances', () => {
      expect(createAwsDataStore().getInstances(dir).length).to.eq(8);
    });
  });

  describe('getInstanceIdByIp', () => {
    it('should return instance by private IP', () => {
      expect(createAwsDataStore().getInstanceIdByIp({ dir, ip: '10.0.2.1' })).to.eq('i-1');
    });
  });

  describe('getRdss', () => {
    it('should return getRdss', () => {
      expect(createAwsDataStore().getRdss(dir).length).to.eq(1);
    });
  });

  describe('getNatGateways', () => {
    it('should return getNatGateways', () => {
      expect(createAwsDataStore().getNatGateways(dir).length).to.eq(2);
    });
  });
});
