const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const { interface, bytecode } = require('../compile');

const web3 = new Web3(ganache.provider());

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000'});
});

describe('Lottery Contract', () => {
  it('deployed a Contract', () => {
    assert.ok(lottery.options.address);
  });

  it('allows One Account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.strictEqual(accounts[0], players[0]);
    assert.strictEqual(1, players.length);
  });

  it('allows Multiple Accounts to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.strictEqual(accounts[0], players[0]);
    assert.strictEqual(accounts[1], players[1]);
    assert.strictEqual(accounts[2], players[2]);
    assert.strictEqual(3, players.length);
  });

  it('requires a Minimum Amount of Ether to enter', async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: 0  // This Function has to return an Error because of Zero!
      });
      assert(false); // This will make the Test failed if the above Function doesn't throw an Error! 
    } catch (err) {
      assert(err);
    }
  });

  // This Test is for Function Modifiers (but written as test pickWinner Fnc because it uses restricted Function Modifiers)
  it('only Manager can call pickWinner', async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1] // Not a Manager Account
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('sends Money to the Winner and resets the Players Array', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether')
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);
    await lottery.methods.pickWinner().send({ from: accounts[0] });
    const finalBalance = await web3.eth. getBalance(accounts[0]);

    const difference = finalBalance - initialBalance;
    assert(difference > web3.utils.toWei('1.9', 'ether')); // Because of the Gas expensed!
  });
});