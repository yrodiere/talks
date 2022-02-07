/* globals d3 */
import Reveal from './reveal/reveal.esm.js';
import RevealMarkdown from './reveal/plugin/markdown/markdown.esm.js';
import RevealNotes from './reveal/plugin/notes/notes.esm.js';
import RevealHighlight from './reveal/plugin/highlight/highlight.esm.js';

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

  // See https://github.com/magjac/d3-graphviz
  document.querySelectorAll(".viz").forEach(vizElement => {
    var dot = vizElement.textContent;
    vizElement.innerHTML = '';

    var engine = vizElement.dataset.vizEngine || 'dot';
    var graphviz = d3.select(vizElement).graphviz()
        .engine(engine);
    var images = vizElement.dataset.vizImages;
    if (images) {
      images.split(';').map(s => s.split(','))
          .forEach(image => {
            graphviz = graphviz.addImage(image[0], image[1], image[2]);
          });
    }
    graphviz.renderDot(
          dot,
          function () {
            vizElement.querySelectorAll("[class^='data-'], [class*=' data-']")
               .forEach(element => convertDataCssClassesToDataAttributes('data-', element));
         });
  });
});