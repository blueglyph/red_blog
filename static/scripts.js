// back links, thanks to @meithecatte, see https://bit.ly/41YByTG
window.addEventListener('load', function () {
    for (const ref of document.getElementsByClassName('footnote-reference')) {
        const hash = ref.children[0].hash.substring(1);
        const refhash = 'ref:' + hash;
        ref.id = refhash;
    }

    for (const footnote of document.getElementsByClassName('footnote-definition')) {
        const hash = footnote.id;
        const refhash = 'ref:' + hash;
        const backlink = document.createElement('a');
        // This doesn't work if there are several references to the same footnote:
        // backlink.href = '#' + refhash;
        // backlink.href = 'javascript:if (window.location.href.search("#") >= 0) history.back()';
        backlink.href = 'javascript:if (window.location.href.endsWith("#' + hash + '")) history.back()';
        backlink.className = 'footnote-backlink';
        backlink.innerText = '↩';
        const paras = footnote.children;
        const lastPara = paras[paras.length - 1];
        lastPara.appendChild(backlink);
    }
});
