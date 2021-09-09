(function() {
    var head = document.getElementsByTagName("head")[0];
    var loaderGif = "loading.cat-and-dog.gif";
    function cssFile(src) {
        var css = document.createElement("link");
        css.setAttribute("rel", "stylesheet");
        css.setAttribute("type", "text/css");
        css.setAttribute("href", src);
        head.appendChild(css);
    }
    function jsFile(src) {
        var js = document.createElement("script");
        js.src = src;
        head.appendChild(js);
    }
    $(".gbmot").attr("style", "display:none"); 
    $(".gbmot").each((_, x) => ankiCard[x.id] = x.innerText);
    $("body").prepend(`<img id="loader" src=${loaderGif} width="200" height="200"/>`);
    cssFile(`tailwind.min.css`);
    MathJax = {loader: {load: ['input/asciimath', 'output/chtml']}};
    jsFile(`https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js`);
    cssFile(`${gbmotAt}global.css`);
    cssFile(`${gbmotAt}build/bundle.css`);
    jsFile(`${gbmotAt}build/bundle.js`);
})()