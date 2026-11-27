(() => {
  'use strict';
  const genealogy = [
    ['Ancestry Historical Records', 'https://www.ancestry.com/search/', ['name']],
    ['FamilySearch Historical Records', 'https://www.familysearch.org/search/record/results', ['q.givenName', 'q.surname']],
    ['Find a Grave', 'https://www.findagrave.com/memorial/search', ['firstname', 'lastname']],
    ['U.S. National Archives', 'https://catalog.archives.gov/search', ['q']]
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  function link(url, label) {
    return '<a target="_blank" rel="noopener noreferrer" href="' + escape(url) + '">' + escape(label) + '</a>';
  }
  function searchUrl(base, params) {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
    return url.href;
  }
  function genealogyCards(given, surname, query) {
    return genealogy.map(([source, url, fields]) => {
      const params = fields.length === 1 ? {[fields[0]]: query} : {[fields[0]]: given, [fields[1]]: surname};
      if (fields[0] === 'name') params.name = given + '_' + surname;
      return '<article><small>HISTORICAL RECORDS · SOURCE SEARCH</small><h3>' + escape(source) +
        '</h3>' + link(searchUrl(url, params), 'Search records →') + '</article>';
    }).join('');
  }
  function globalGenealogy(query) {
    const words = query.trim().split(/\s+/);
    return genealogyCards(words.slice(0, -1).join(' '), words.at(-1), query);
  }
  async function json(url) {
    const response = await fetch(url, {signal: AbortSignal.timeout(9500)});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }
  const shelves = [
    {
      name: 'Project Gutenberg',
      async search(query) {
        const data = await json(searchUrl('https://gutendex.com/books', {search: query}));
        return data.results.filter(book => book.copyright === false && /^\d+$/.test(book.id)).slice(0, 12).map(book => ({
          title: book.title,
          author: book.authors.map(person => person.name).join(', '),
          url: 'https://www.gutenberg.org/ebooks/' + book.id,
          label: 'Open ebook →'
        }));
      }
    },
    {
      name: 'Open Library',
      async search(query) {
        const data = await json(searchUrl('https://openlibrary.org/search.json', {
          q: '(' + query + ') AND public_scan_b:true', fields: 'key,title,author_name,first_publish_year,public_scan_b', limit: '12'
        }));
        return data.docs.filter(book => book.public_scan_b === true && /^\/works\/OL\d+W$/.test(book.key)).map(book => ({
          title: book.title,
          author: (book.author_name || []).join(', '),
          year: book.first_publish_year,
          url: 'https://openlibrary.org' + book.key,
          label: 'Find public scan →'
        }));
      }
    }
  ];
  let libraryRequest = 0;
  async function searchLibrary(query) {
    query = query.trim();
    const currentRequest = ++libraryRequest;
    const field = document.querySelector('#library-query');
    const status = document.querySelector('#library-status');
    const output = document.querySelector('#library-results');
    field.value = query;
    output.replaceChildren();
    status.textContent = 'Searching book catalogs…';
    const selected = document.querySelector('#library-shelf').value;
    const active = shelves.filter(shelf => !selected || shelf.name === selected);
    const settled = await Promise.allSettled(active.map(shelf => shelf.search(query)));
    if (currentRequest !== libraryRequest) return;
    let total = 0;
    const failed = [];
    output.innerHTML = settled.map((result, index) => {
      const name = active[index].name;
      if (result.status === 'rejected') {
        failed.push(name);
        return '';
      }
      total += result.value.length;
      return result.value.map(book => '<article><small>' + escape(name) + '</small><h3>' +
        escape(book.title) + '</h3><p>' + escape([book.author, book.year].filter(Boolean).join(' · ')) +
        '</p>' + link(book.url, book.label) + '</article>').join('');
    }).join('');
    status.textContent = total + ' readable editions or works with public scans shown.' +
      (failed.length ? ' Unavailable: ' + failed.join(', ') + '.' : '');
    document.querySelector('#library-portals').innerHTML = [
      link(searchUrl('https://www.gutenberg.org/ebooks/search/', {query}), 'Search Project Gutenberg'),
      link(searchUrl('https://openlibrary.org/search', {q: query + ' public_scan_b:true'}), 'Search Open Library public scans'),
      link(searchUrl('https://archive.org/search', {query: '(' + query + ') AND mediatype:texts', sin: 'TXT'}), 'Search inside Internet Archive books')
    ].join(' · ');
  }
  function boot() {
    document.querySelector('#genealogy-form').addEventListener('submit', event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const given = fields.get('given').trim();
      const surname = fields.get('surname').trim();
      if (!given && !surname) return;
      document.querySelector('#genealogy-results').innerHTML = genealogyCards(given, surname, [given, surname].filter(Boolean).join(' '));
    });
    const library = document.querySelector('#library-form');
    library.addEventListener('submit', event => {
      event.preventDefault();
      const query = document.querySelector('#library-query').value;
      if (query.trim()) void searchLibrary(query);
    });
    document.querySelector('#library-shelf').addEventListener('change', () => library.requestSubmit());
  }
  window.DOMArchiveCollections = Object.freeze({searchLibrary, globalGenealogy});
  boot();
})();
