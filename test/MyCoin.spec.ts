import { expect } from 'chai';
import { getAccountInfo } from '@src/services/AccountService';

// // var assert = require('assert');
//  describe('Array', function () {
//   describe('#indexOf()', function () {
//     it('should return -1 when the value is not present', function () {
//       // assert.equal([1, 2, 3].indexOf(4), -1);
//     });
//   });
// });

describe('MyCoin', function () {
  describe('getAccountInfo()', function () {
    it('현재 가지고있는 코인 리스트를 가져와라.', function (done) {
      return getAccountInfo()
        .then(function (result) {
          console.log('result', result);
          done();
        })
        .catch(function (error) {
          console.log('error', error);
          throw error;
        });
    });
  });
});
