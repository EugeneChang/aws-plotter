/* eslint-disable */
(function () {
  var elements;
  var styles;
  var cy;

  var promises = [
    fetch('elements.json').then(function(response) {
      return response.json();
    }).then(function(obj) {
      elements = obj;
    }),
    fetch('styles.json').then(function(response) {
      return response.json();
    }).then(function(obj) {
      styles = obj;
    }),
  ];

  Promise.all(promises).then(function() {
    cy = cytoscape({
      container: document.getElementById('cy'),
      boxSelectionEnabled: false,
      style: styles,
      elements: elements,
      layout: {
        name: 'cose-bilkent',
        nodeRepulsion: 200000,
      }
    });
  });

  // Save as image
  document.getElementById("camera").addEventListener("click", function () {
      var png = cy.png( {
          output: 'blob',
          full: true,
          bg: 'white'
      });
      saveAs(png, new Date().getTime() + ".png");
  });
}());
