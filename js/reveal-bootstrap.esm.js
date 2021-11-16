/* globals Viz */
import Reveal from './reveal/reveal.esm.js';
import RevealMarkdown from './reveal/plugin/markdown/markdown.esm.js';
import RevealNotes from './reveal/plugin/notes/notes.esm.js';
import RevealHighlight from './reveal/plugin/highlight/highlight.esm.js';
//import RevealViz from './reveal-plugin-viz.esm.js';

// More info https://github.com/hakimel/reveal.js#configuration
let deck = new Reveal({
  history: true,
  highlight: {
    beforeHighlight: hljs => {
      hljs.configure({
        // Disable language auto-detection (it detects Java properties as "stylus"...)
        languages: []
      });
    }
  },
  plugins: [ RevealMarkdown, RevealNotes, RevealHighlight ]
});
deck.initialize().then(() => {
  function toCamelCase(string) {
    return string.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
  }

  function convertDataCssClassesToDataAttributes(prefix, element) {
    element.classList.forEach(cssClass => {
      if (cssClass.startsWith(prefix)) {
        var split = cssClass.substring(prefix.length).split('_');
        var dataKey = toCamelCase(split[0]);
        var dataValue = split[1];
        console.debug("Setting %s=%s on %O", dataKey, dataValue, element);
        element.dataset[dataKey] = dataValue;
      }
    } );
  }

  // See also https://github.com/mdaines/viz.js/wiki/Usage
  var viz = new Viz();
  document.querySelectorAll(".viz").forEach(vizElement => {
    var engine = vizElement.dataset.vizEngine || 'dot';
    viz.renderSVGElement(vizElement.textContent, {engine: engine})
        .then(svgElement => {
          svgElement.querySelectorAll("[class^='data-'], [class*=' data-']")
              .forEach(element => convertDataCssClassesToDataAttributes('data-', element));
          vizElement.innerHTML = '';
          vizElement.appendChild(svgElement);
        })
        .catch(error => {
          // Create a new Viz instance (see https://github.com/mdaines/viz.js/wiki/Caveats for more info)
          viz = new Viz();
          console.error("Viz.js: Error while rendering:\n %s\nError:\n%O", vizElement.textContent, error);
        });
  });
});