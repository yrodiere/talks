/* globals head,hljs,Reveal,Viz */

// Handle print feature
var link = document.createElement( 'link' );
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = window.location.search.match( /print-pdf/gi ) ? '../css/print/pdf.css' : '../css/print/paper.css';
document.getElementsByTagName( 'head' )[0].appendChild( link );

head.ready(document, function() {
	var vizJsLoadedCallback;
	var vizFullRenderJsLoadedCallback;

	/*
	 * We have to load two JS files before we can initialize viz.js,
	 * and reveal.js does not have a built-in feature to call a callback after two files were loaded
	 * (only after one file was loaded)
	 * So we hack our way through using promises.
	 */
	Promise.all([
		new Promise((resolve, reject) => { vizJsLoadedCallback = resolve; }),
		new Promise((resolve, reject) => { vizFullRenderJsLoadedCallback = resolve; })
	])
			.then(() => {
					var viz = new Viz();
					document.querySelectorAll(".viz").forEach(vizElement => {
						viz.renderSVGElement(vizElement.textContent)
								.then(svgElement => {
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

	// More info https://github.com/hakimel/reveal.js#configuration
	Reveal.initialize({
		history: true,
		// More info https://github.com/hakimel/reveal.js#dependencies
		dependencies: [
			{ src: '../js/plugin/markdown/marked.js' },
			{ src: '../js/plugin/markdown/markdown.js' },
			{ src: '../js/plugin/notes/notes.js', async: true },
			{ src: '../js/plugin/highlight/highlight.js', async: true,
				callback: function() {
					hljs.configure({
						// Disable language auto-detection (it detects Java properties as "stylus"...)
						languages: [] 
					});
					hljs.initHighlightingOnLoad();
				}
			},
			{ src: '../js/viz/viz.js', async: true, callback: vizJsLoadedCallback },
			{ src: '../js/viz/full.render.js', async: true, callback: vizFullRenderJsLoadedCallback }
		]
	});
});
