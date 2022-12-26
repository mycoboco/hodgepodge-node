/*
 *  hides credentials from connection urls
 */

module.exports = (url = '') => url.replace(
  /([a-z]+:\/\/)?([^:]+)(:.+)?(@.*)/,
  (_match, p1 = '', p2 = '', p3 = '', p4 = '') => `${p1}${p2}${(p3) ? ':???' : ''}${p4}`,
);

// eslint-disable-next-line no-constant-condition
if (false) {
  const hide = module.exports;

  console.log(hide()); // empty
  console.log(hide('')); // empty
  console.log(hide('mysql://')); // mysql://
  console.log(hide('mysql://foo1!:bar1!@example.com')); // mysql://foo1!:???@example.com
  console.log(hide('mysql://foo1!@example.com')); // mysql://foo1!@example.com
  console.log(hide('mysql://:bar1!@example.com')); // invalid url
  console.log(hide('mysql://example.com')); // mysql://example.com
  console.log(hide('foo1!:bar1!@example.com')); // foo1!:???@example.com
  console.log(hide(':bar1!@example.com')); // invalid url
  console.log(hide('foo1!@example.com')); // foo1!@example.com
  console.log(hide('@example.com')); // invalid url
  console.log(hide('example.com')); // example.com

  console.log(hide('mongodb://foo1!:bar1!@host1.com:1111,host2.com:2222/database'));
  // mongodb://foo1!:???@host1.com:1111,host2.com:2222/databse

  console.log(hide('foo1!:bar1!@host1.com:1111,host2.com:2222/database'));
  // foo1!:???@host1.com:1111,host2.com:2222/databse

  console.log(hide('foo1!@host1.com:1111,host2.com:2222/database'));
  // foo1!@host1.com:1111,host2.com:2222/databse

  console.log(hide('host1.com:1111,host2.com:2222/database'));
  // host1.com:1111,host2.com:2222/databse
}

// end of hide.js
