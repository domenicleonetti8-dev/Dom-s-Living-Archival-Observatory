(() => {
  'use strict';
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
  function parsePerson(query) {
    const parts = query.trim().split(/\s+/);
    if (query.includes(',')) {
      const [surname, ...given] = query.split(',');
      return {given: given.join(',').trim(), surname: surname.trim()};
    }
    return {given: parts.slice(0, -1).join(' '), surname: parts.at(-1)};
  }
  function birthYear(value) {
    if (!value) return '';
    if (/^[1-9]\d{3}$/.test(value)) return value;
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? value.slice(0, 4) : null;
  }
  const fullName = ({given, surname}) => [given, surname].filter(Boolean).join(' ');
  const quotedName = person => '"' + fullName(person).replaceAll('"', '') + '"';
  function genealogySources({given, surname}, year) {
    const phrase = quotedName({given, surname});
    return [
      ['FamilySearch', 'Census, vital and immigration records', 'https://www.familysearch.org/search/record/results',
        {'q.givenName': given, 'q.surname': surname, 'q.birthLikeDate.fromYear': year, 'q.birthLikeDate.toYear': year}, true],
      ['Ancestry', 'Historical records and family trees', 'https://www.ancestry.com/search/',
        {name: given + '_' + surname, birth: year}, true],
      ['Find a Grave', 'Cemetery and memorial records', 'https://www.findagrave.com/memorial/search',
        {firstname: given, lastname: surname, birthyear: year}, true],
      ['U.S. National Archives', 'Federal records and catalog descriptions', 'https://catalog.archives.gov/search', {q: phrase}],
      ['Chronicling America', 'Historic U.S. newspaper mentions', 'https://www.loc.gov/collections/chronicling-america/', {q: phrase}],
      ['Internet Archive', 'Mentions inside digitized books', 'https://archive.org/search', {query: phrase + ' AND mediatype:texts', sin: 'TXT'}]
    ];
  }
  function genealogyCards(person, year = '') {
    return genealogySources(person, year).map(([source, coverage, url, params, usesYear]) =>
      '<article><small>SOURCE SEARCH · ' + escape(year && usesYear ? 'BIRTH YEAR ' + year : 'NAME LOOKUP') +
      '</small><h3>' + escape(source) + '</h3><p>' + escape(coverage) + '</p>' +
      link(searchUrl(url, params), 'Search records →') +
      (year && usesYear ? ' · ' + link(searchUrl(url, genealogySources(person, '').find(row => row[0] === source)[3]), 'Search without year') : '') +
      '</article>'
    ).join('');
  }
  function globalGenealogy(query) {
    return genealogyCards(parsePerson(query));
  }
  let personRequest = 0;
  async function searchPerson(person, year) {
    const request = ++personRequest;
    document.querySelector('#genealogy-results').innerHTML = genealogyCards(person, year);
    const status = document.querySelector('#genealogy-status');
    const leads = document.querySelector('#genealogy-leads');
    leads.replaceChildren();
    const summary = 'Searching for ' + fullName(person) + (year ? ' · birth year ' + year : '') + '. ';
    status.textContent = summary + 'Checking historic newspapers for the exact name…';
    try {
      const data = await json(searchUrl('https://www.loc.gov/collections/chronicling-america/', {
        q: quotedName(person), fo: 'json', c: '10'
      }));
      if (!Array.isArray(data.results)) throw new Error('Unexpected newspaper response');
      if (request !== personRequest) return;
      const records = data.results.filter(record => typeof record.id === 'string' &&
        /^https:\/\/www\.loc\.gov\/(?:resource|item)\//.test(record.id)).slice(0, 8);
      leads.innerHTML = records.map(record => '<article><small>NEWSPAPER LEAD · VERIFY IDENTITY</small><h3>' +
        escape(record.title || 'Historic newspaper') + '</h3><p>' + escape(record.date || '') + '</p>' +
        link(record.id, 'Open original →') + '</article>').join('');
      status.textContent = summary + (records.length ?
        records.length + ' newspaper leads. Compare dates and relatives with the original records.' :
        'No newspaper leads returned. Try the record collections or a spelling variant.');
    } catch (_) {
      if (request === personRequest) status.textContent = summary +
        'The newspaper API is unavailable. The source searches below are ready to open.';
    }
  }
  function preparePerson(query) {
    const person = parsePerson(query);
    const form = document.querySelector('#genealogy-form');
    form.elements.given.value = person.given;
    form.elements.surname.value = person.surname;
    form.elements.birth.value = '';
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
      const form = event.currentTarget;
      const given = form.elements.given.value.trim();
      const surname = form.elements.surname.value.trim();
      const year = birthYear(form.elements.birth.value.trim());
      if (!given && !surname) {
        document.querySelector('#genealogy-status').textContent = 'Enter a first or last name.';
        form.elements.given.focus();
        return;
      }
      if (year === null) {
        document.querySelector('#genealogy-status').textContent = 'Enter a valid date as YYYY-MM-DD, or a four-digit birth year.';
        form.elements.birth.focus();
        return;
      }
      void searchPerson({given, surname}, year);
    });
    const library = document.querySelector('#library-form');
    library.addEventListener('submit', event => {
      event.preventDefault();
      const query = document.querySelector('#library-query').value;
      if (query.trim()) void searchLibrary(query);
    });
    document.querySelector('#library-shelf').addEventListener('change', () => library.requestSubmit());
  }
  window.DOMArchiveCollections = Object.freeze({searchLibrary, globalGenealogy, preparePerson});
  boot();
})();
