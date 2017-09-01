let client;

const deDuplicate = (callback) => {
  client.sinter('survival:killed', 'survival:impaired', (err1, data1) => {
    if (err1) {
      console.error(err1)
    } else {
      if (data1.length) console.log('killed + impaired: %d', data1.length);
      client.srem('survival:impaired', data1, (e1, d1) => {
        client.sinter('survival:killed', 'survival:unaffected', (err2, data2) => {
          if (err2) {
            console.error(err2)
          } else {
            if (data2.length) console.log('killed + unaffected: %d', data2.length);
            client.srem('survival:unaffected', data2, (e2, d2) => {
              client.sinter('survival:killed', 'survival:weakened', (err4, data4) => {
                if (err4) {
                  console.error(err4)
                } else {
                  if (data4.length) console.log('killed + weakened: %d', data4.length);
                  client.srem('survival:weakened', data4, (e6, d6) => {
                    client.sinter('survival:killed', 'survival:unknown', (err3, data3) => {
                      if (err3) {
                        console.error(err3)
                      } else {
                        if (data3.length) console.log('killed + unknown: %d', data3.length);
                        client.srem('survival:unknown', data3, (e3, d3) => {
                          client.sinter('survival:impaired', 'survival:weakened', (err7, data7) => {
                            if (err7) {
                              console.error(err7);
                            } else {
                              if (data7.length) console.log('impaired + weakened: %d', data7.length);
                              client.srem('survival:weakened', data7, (e7, d7) => {
                                client.sinter('survival:impaired', 'survival:unaffected', (err5, data5) => {
                                  if (err5) {
                                    console.error(err5)
                                  } else {
                                    if (data5.length) console.log('impaired + unaffected: %d', data5.length);
                                    client.srem('survival:unaffected', data5, (e4, d4) => {
                                      client.sinter('survival:impaired', 'survival:unknown', (err6, data6) => {
                                        if (err6) {
                                          console.error(err6)
                                        } else {
                                          if (data6.length) console.log('impaired + unknown: %d', data6.length);
                                          client.srem('survival:unknown', data6, (e5, d5) => {
                                            return callback(null, 'OK');
                                          });
                                        }
                                      });
                                    });
                                  }
                                });
                              });
                            }
                          });
                        });
                      }
                    });
                  });
                }
              });
            });
          }
        });
      });
    }
  });
}

const survivalAnalysis = () => {
  return client.smembers('binValues')
    .then(bins => {
      client.multi()
        .zcard(`survival:${bins[0]}`)
        .zcard(`survival:${bins[1]}`)
        .zcard(`survival:${bins[2]}`)
        .zcard(`survival:${bins[3]}`)
        .zcard(`survival:${bins[4]}`)
        .zcard('uniqueClaims')
        .scard('allClaims')
        .exec()
        .then(results => {
          const totalClaims = results.pop()[0];
          const uniqueClaims = results.pop();
          const survival = [];
          for (let i = 0; i < results.length; i += 1) {
            survival.push({ type: bins[i], count: results[i] })
          }
          // Total Claims
          console.log('Total claims: %s', totalClaims);
          // Total Instituted
          // Unique Claims
          console.log('Unique claims: %d', uniqueClaims);
          // Unique Claims by disposition
          console.log('Claim Survival Count\n%j', survival.map(item => `${item.type}: ${item.count}`));
          console.log('%j', survival.map(item => `${item.type}: ${Math.round(1000 * (item.count / uniqueClaims)) / 10}%`));
          return Promise.resolve({ totalClaims, uniqueClaims, survival });
        })
        .catch(err => Promise.reject(err))
    })
    .catch(err => Promise.reject(err))
}

const test = () => {
  survivalAnalysis()
    .then(done => {
      deDuplicate((err2, data) => {
        survivalAnalysis((err3, done2) => {
          client.quit();
        })
      });
    })
    .catch(err => console.error(err));
}

const pauseForTest = 9;

module.exports = {
  survivalAnalysis
}