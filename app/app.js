import $ from 'jquery';

import BpmnModeler from 'bpmn-js/lib/Modeler';

import pizzaDiagram from '../resources/diag.bpmn';

import customElements from '../resources/customElements.json';

import CustomModeler from './custom-modeler';

import BpmnModdle from 'bpmn-moddle';

var moddle = new BpmnModdle();

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
    openDiagram(pizzaDiagram, customElements);
  else {
    modeler.clear()
    modeler.createDiagram(function(err) {

      if (err) {
        container
            .removeClass('with-diagram')
            .addClass('with-error');

        container.find('.error pre').text(err.message);

      } else {
        container
            .removeClass('with-error')
            .addClass('with-diagram');
        body.addClass('shown')
      }


    })
  }
}


function openDiagram(xml, json) {

  modeler.importXML(xml, function(err) {

    if (err) {
      container
        .removeClass('with-diagram')
        .addClass('with-error');

      container.find('.error pre').text(err.message);

      console.error(err);
    } else {
      console.log("here")
      container
        .removeClass('with-error')
        .addClass('with-diagram');

      if(json != null)
        modeler.addCustomElements(json);
      body.addClass('shown')
    }


  });
}

function saveSVG(done) {
  modeler.saveSVG(done);
}

function fixTaskData(task) {
  if(task.dataInputAssociations || task.dataOutputAssociations) {
    // Create ioSpecification
    let ioSpecification = moddle.create('bpmn:InputOutputSpecification', {id: 'io_'+task.get('id')})
    if(task.dataInputAssociations)
      task.dataInputAssociations.forEach((obj) => {
        let dataInput = moddle.create('bpmn:DataInput', {id:'input_'+ obj.get('id')})
        ioSpecification.get('dataInputs').push(dataInput)
        obj.set('targetRef', dataInput)
        let name = obj.get('name')
        if(!name)
          obj.set('name', "")
      })
    if(task.dataOutputAssociations)
      task.dataOutputAssociations.forEach((obj) => {
        let dataOutput = moddle.create('bpmn:DataOutput', {id:'output_'+ obj.get('id')})
        ioSpecification.get('dataOutputs').push(dataOutput)
        obj.set('sourceRef', [dataOutput])
        let name = obj.get('name')
        if(!name)
          obj.set('name', "")
     })
    task.set("ioSpecification", ioSpecification)

    // Remove properties for data
  }
  let name = task.get('name')
  if(!name)
    task.set('name', "")
  return task
}

function saveDiagram(done) {

  modeler.saveXML({ format: true }, function(err, xml) {
    moddle.fromXML(xml, (err, def) => {
      def.get("rootElements").forEach((obj) => {
        if(obj.$type.includes('Process')) {
          obj.get('flowElements').forEach((el) => {
            if(el.$type.includes('Task'))
              fixTaskData(el)
            else if(el.$type === 'bpmn:DataObjectReference') {
              let name = el.get('name')
              if(!name)
                el.set('name', "")

            }

          })
        }
      })
      moddle.toXML(def,{ format: true }, (err, res) => {
        done(err, res, modeler.getCustomElements());
      })
    })

    // console.log(modeler.getJson())
  });
}

function handleFiles(files, callback) {
  var bpmn, jsonFile;
  if(files[0].name.includes(".bpmn")) {
    bpmn = files[0]
    if(files[1] && files[1].name.includes(".json"))
      jsonFile = files[1]
    else if(files[1] )
      window.alert("second file is not a json file")
  }
  else if(files[1].name.includes(".bpmn")) {
    bpmn = files[1]
    if(files[0] && files[0].name.includes(".json"))
      jsonFile = files[0]
    else if(files[0] )
      window.alert("second file is not a json file")
  }
  else {
    window.alert("missing bpmn file")
  }
  var reader = new FileReader();

  reader.onload = function(e) {
    var xml = e.target.result;
    let reader1 = new FileReader();

    if(jsonFile) {
      reader1.onload = function(e) {
        let json = JSON.parse(e.target.result);
        callback(xml, json);
      };

      reader1.readAsText(jsonFile);
    }
    else
      callback(xml, null);
  };

  reader.readAsText(bpmn);
}

function registerFileDrop(container, callback) {

  function handleFileSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;
    console.log(files)
    handleFiles(files, callback)
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

  $('#js-open-diagram').click(function(e) {
    e.stopPropagation();
    e.preventDefault();

    let input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.click()
    input.addEventListener('input', function (evt) {
      console.log(evt.target.files)
      handleFiles(evt.target.files, openDiagram)
    })
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

  function setMultipleEncoded(link, name, data) {


    if (data) {
      let urls = []
      window.localStorage.setItem("diagram", encodeURIComponent(data[0]))
      window.localStorage.setItem("custom", encodeURIComponent(JSON.stringify(data[1])))
    } else {
      link.removeClass('active');
    }
  }

  var exportArtifacts = debounce(function() {

    saveSVG(function(err, svg) {
      setEncoded(downloadSvgLink, 'diagram.svg', err ? null : svg);
    });

    saveDiagram(function(err, xml) {
      // setEncoded(downloadLink, 'custom.elements', err ? null : json)
      // setEncoded(downloadLink, 'diagram.bpmn', err ? null : xml)
      // console.log("what?")
      let json = modeler.getJson()
      setMultipleEncoded(downloadLink, 'diagram.bpmn', err ? null : [xml, json])
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
