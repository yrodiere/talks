/* globals head,hljs,Reveal,mermaid */

// Handle print feature
var link = document.createElement( 'link' );
link.rel = 'stylesheet';
link.type = 'text/css';
link.href = window.location.search.match( /print-pdf/gi ) ? '../css/print/pdf.css' : '../css/print/paper.css';
document.getElementsByTagName( 'head' )[0].appendChild( link );

head.ready(document, function() {
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
			{ src: '../js/mermaid.min.js', async: true,
				callback: function() {
					mermaid.initialize({startOnLoad:true});
				}
			}
		]
	});
});
