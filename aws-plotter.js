// Exports a factory function
module.exports = () => {
  const elements = { nodes: [], edges: [] };
  const parents = {};

  let count = 0;

  const getElements = () => elements;
  const findUniqueParentsByClass = clazz => Object.values(parents).filter(parent => parent.classes === clazz)
    .reduce((accumulator, current) => {
      if (!accumulator.map(parent => parent.id).includes(current.id)) {
        accumulator.push(current);
      }
      return accumulator;
    }, []);

  function getNextCount() {
    count += 1;
    return count;
  }

  // Add parent/child relationship
  function addParent({
    childId,
    id,
    classes,
    label,
  }) {
    parents[childId] = { id, classes, label };
  }

  function addEdge({
    source, target, label, arrow,
  }) {
    const existingEdge = elements.edges.find(edge => edge.data.source === source && edge.data.target === target);
    if (existingEdge) {
      console.log('Edge already exists:', source, target);
      return null;
    }
    const data = { id: `edge-${getNextCount()}`, source, target };

    if (label) {
      data.label = label;
    }
    if (arrow) {
      data.arrow = arrow;
    }
    const edge = { data };
    elements.edges.push(edge);
    return edge;
  }

  function addNode({
    id, label, classes, parent, parentId,
  }) {
    const existingNode = elements.nodes.find(node => node.data.id === id);
    if (existingNode) {
      console.log('Node already exists:', id);
      return null;
    }
    const data = { id, label };

    if (parent) {
      addParent({
        childId: id, id: parent.id, classes: parent.classes, label: parent.label,
      });
      const grandParent = parent.parent;
      if (grandParent) {
        addParent({
          childId: parent.id, id: grandParent.id, classes: grandParent.classes, label: grandParent.label,
        });
      }
    }

    data.parent = parentId || (parent && parent.id);
    const node = { data, classes };
    elements.nodes.push(node);
    return node;
  }

  function addPhantomNode(id) {
    addNode({ id, label: id, classes: 'phantom' });
  }

  function getEdgeIds() {
    return elements.edges.reduce((set, edge) => {
      set.add(edge.data.source);
      set.add(edge.data.target);
      return set;
    }, new Set());
  }

  function getNodeIds() {
    return new Set(elements.nodes.map(node => node.data.id));
  }

  function buildParentNodes() {
    const uniqueIds = Object.values(parents).reduce((s, value) => s.add(value.id), new Set(Object.keys(parents)));
    const nodeIds = getNodeIds();
    const missingIds = new Set([...uniqueIds].filter(x => !nodeIds.has(x)));
    missingIds.forEach((id) => {
      const current = Object.values(parents).find(p => p.id === id);
      const parent = parents[id];
      addNode({
        id, label: current.label || id, classes: current.classes, parentId: parent && parent.id,
      });
    });
  }

  function getNameFromTags(tags) {
    const tag = tags && tags.find(t => t.Key === 'Name');
    return tag && tag.Value;
  }

  function getMissingNodeIds() {
    const nodeIdsFromEdges = getEdgeIds();
    const nodeIds = getNodeIds();
    return new Set([...nodeIdsFromEdges].filter(x => !nodeIds.has(x)));
  }

  function buildPhantomNodes() {
    getMissingNodeIds().forEach(id => addPhantomNode(id));
  }

  function attachInstances(instances) {
    // Use missingIds to add nodes from instances
    getMissingNodeIds().forEach((id) => {
      const instance = instances && instances.find(i => i.InstanceId === id);
      if (instance) {
        const subnetId = instance.SubnetId;
        addNode({
          id, label: getNameFromTags(instance.Tags), classes: 'ec2', parent: { id: subnetId, classes: 'subnet' },
        });
      }
    });
  }

  function attachSubnets(subnets) {
    findUniqueParentsByClass('subnet').forEach((subnetParent) => {
      const subnetId = subnetParent.id;
      const subnet = subnets.find(s => s.SubnetId === subnetId);
      if (subnet) {
        const name = getNameFromTags(subnet.Tags);
        const label = `${name ? `${name}` : ''} ${subnet.CidrBlock}`;
        const vpcAzId = `${subnet.VpcId}-${subnet.AvailabilityZone}`;
        addNode({
          id: subnetId, label, classes: 'subnet', parent: { id: vpcAzId, classes: 'vpc-az', label: subnet.AvailabilityZone },
        });
        addParent({ childId: vpcAzId, id: subnet.VpcId, classes: 'vpc' });
      } else {
        addPhantomNode(subnetId);
      }
    });
  }

  function attachVpcs(vpcs) {
    findUniqueParentsByClass('vpc').forEach((vpcParent) => {
      const vpcId = vpcParent.id;
      const vpc = vpcs.find(s => s.VpcId === vpcId);
      const name = getNameFromTags(vpc.Tags);
      const label = `${name ? `${name}` : ''} ${vpc.CidrBlock}`;

      addNode({
        id: vpcId, label, classes: 'vpc', parent: { id: vpc.region, classes: 'region' },
      });

      addParent({ childId: vpc.region, id: 'aws' });
    });
  }

  function removePseudoElements() {
    const pseudoNodeIds = elements.nodes.filter(node => node.classes === 'pseudo').map(node => node.data.id);
    const fn = data => !pseudoNodeIds.includes(data.source) && !pseudoNodeIds.includes(data.target);
    if (pseudoNodeIds) {
      // Remove pseudo edges
      elements.edges = elements.edges.filter(edge => fn(edge.data));
      // Remove pseudo nodes
      elements.nodes = elements.nodes.filter(node => node.classes !== 'pseudo');
    }
  }

  // Attach AWS resources and build missing nodes
  function attachAwsResources({ instances, subnets, vpcs } = {}) {
    if (instances) {
      attachInstances(instances);
    }

    if (subnets) {
      attachSubnets(subnets);
    }

    if (vpcs) {
      attachVpcs(vpcs);
    }

    buildParentNodes();
    buildPhantomNodes();
    removePseudoElements();

    // Add class
    const awsNode = elements.nodes.find(node => node.data.id === 'aws');
    if (awsNode) {
      awsNode.classes = 'aws';
    }
  }

  // Child is pseudo node, parent is normal node
  function addPseudoNode({ parent }) {
    return addNode({
      id: `pseudo-${getNextCount()}`, label: 'pseudo', classes: 'pseudo', parent,
    });
  }

  // Exposed functions
  return {
    getElements,
    addEdge,
    addNode,
    attachAwsResources,
    getNameFromTags,
    addPseudoNode,
  };
};
