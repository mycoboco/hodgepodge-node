/*
 *  drops privieges by chaning uid/gid
 */

export default function _(
  runAs,
  log = {
    info: () => {},
    warning: () => {},
    error: () => {},
  },
  exit = () => {},
) {
  if (runAs?.uid && runAs.gid) {
    try {
      log.info(`try to run as ${runAs.uid}:${runAs.gid}`);
      process.setgid(runAs.gid);
      process.setuid(runAs.uid);
    } catch (err) {
      log.error(err);
      exit();
    }
  } else if (process.getuid() === 0 || process.getgid() === 0) {
    log.warning('server will run as root!');
  }
}

// eslint-disable-next-line no-constant-condition
if (false) {
  (async () => {
    const {userInfo} = await import('os');
    const {username: user} = userInfo();

    _(
      {
        uid: user,
        gid: user,
      },
      console,
    );
  })();
}

// end of dropPrivilege.js
