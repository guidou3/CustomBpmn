import $ from 'jquery';

import BpmnModeler from 'bpmn-js/lib/Modeler';

import pizzaDiagram from '../resources/diag.bpmn';

import customElements from './custom-elements.json';

import CustomModeler from './custom-modeler';

var container = $('#js-drop-zone');
let body =$('body')

var modeler = new CustomModeler({
  container: '#js-canvas',
  keyboard: {
    bindTo: document
  }
});

function createNewDiagram(bool) {
  if(bool)
    openDiagram(pizzaDiagram);
  else {
    modeler.clear()
    modeler.createDiagram(function(err) {

      if (err) {
        container
            .removeClass('with-diagram')
            .addClass('with-error');

        container.find('.error pre').text(err.message);

        console.error(err);
      } else {
        container
            .removeClass('with-error')
            .addClass('with-diagram');
        body.addClass('shown')
      }


    })
  }
}


function openDiagram(xml) {

  modeler.importXML(xml, function(err) {

    if (err) {
      container
        .removeClass('with-diagram')
        .addClass('with-error');

      container.find('.error pre').text(err.message);

      console.error(err);
    } else {
        container
          .removeClass('with-error')
          .addClass('with-diagram');
        modeler.addCustomElements(customElements);
        body.addClass('shown')
    }


  });
}

function saveSVG(done) {
  modeler.saveSVG(done);
}

function saveDiagram(done) {

  modeler.saveXML({ format: true }, function(err, xml) {
    done(err, xml);
    console.log(modeler.getCustomElements())
  });
}

function registerFileDrop(container, callback) {

  function handleFileSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;

    var file = files[0];

    var reader = new FileReader();

    reader.onload = function(e) {

      var xml = e.target.result;

      callback(xml);
    };

    reader.readAsText(file);
  }

  function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();

    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  container.get(0).addEventListener('dragover', handleDragOver, false);
  container.get(0).addEventListener('drop', handleFileSelect, false);
}


// file drag / drop ///////////////////////

// check file api availability
if (!window.FileList || !window.FileReader) {
  window.alert(
    'Looks like you use an older browser that does not support drag and drop. ' +
    'Try using Chrome, Firefox or the Internet Explorer > 10.');
} else {
  registerFileDrop(container, openDiagram);
}

// bootstrap diagram functions

$(function() {

  $('#js-create-diagram').click(function(e) {
    e.stopPropagation();
    e.preventDefault();

    createNewDiagram(true);
  });

  $('#js-create-diagram2').click(function(e) {
    e.stopPropagation();
    e.preventDefault();

    createNewDiagram(false);
  });

  var downloadLink = $('#js-download-diagram');
  var downloadSvgLink = $('#js-download-svg');

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setEncoded(link, name, data) {
    var encodedData = encodeURIComponent(data);

    if (data) {
      link.addClass('active').attr({
        'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
        'download': name
      });
    } else {
      link.removeClass('active');
    }
  }

  var exportArtifacts = debounce(function() {

    saveSVG(function(err, svg) {
      setEncoded(downloadSvgLink, 'diagram.svg', err ? null : svg);
    });

    saveDiagram(function(err, xml) {
      setEncoded(downloadLink, 'diagram.bpmn', err ? null : xml);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});



// helpers //////////////////////

function debounce(fn, timeout) {

  var timer;

  return function() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(fn, timeout);
  };
}