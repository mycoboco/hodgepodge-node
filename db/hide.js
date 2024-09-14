/*
 *  hides credentials from connection urls
 */

export default function _(url = '') {
  return url.replace(
    /([a-z]+:\/\/)?([^:]*)(:.+)?(@.*)/,
    (_match, p1 = '', p2 = '', p3 = '', p4 = '') => `${p1}${p2}${(p3) ? ':???' : ''}${p4}`,
  );
}

// eslint-disable-next-line no-constant-condition
if (false) {
  console.log(_()); // empty
  console.log(_('')); // empty
  console.log(_('mysql://')); // mysql://
  console.log(_('mysql://foo1!:bar1!@example.com')); // mysql://foo1!:???@example.com
  console.log(_('mysql://foo1!@example.com')); // mysql://foo1!@example.com
  console.log(_('mysql://:bar1!@example.com')); // mysql://:???@example.com
  console.log(_('mysql://example.com')); // mysql://example.com
  console.log(_('foo1!:bar1!@example.com')); // foo1!:???@example.com
  console.log(_(':bar1!@example.com')); // :???@example.com
  console.log(_('foo1!@example.com')); // foo1!@example.com
  console.log(_('@example.com')); // invalid url
  console.log(_('example.com')); // example.com

  console.log(_('mongodb://foo1!:bar1!@host1.com:1111,host2.com:2222/database'));
  // mongodb://foo1!:???@host1.com:1111,host2.com:2222/databse

  console.log(_('foo1!:bar1!@host1.com:1111,host2.com:2222/database'));
  // foo1!:???@host1.com:1111,host2.com:2222/databse

  console.log(_('foo1!@host1.com:1111,host2.com:2222/database'));
  // foo1!@host1.com:1111,host2.com:2222/databse

  console.log(_('host1.com:1111,host2.com:2222/database'));
  // host1.com:1111,host2.com:2222/databse
}

// end of hide.js
