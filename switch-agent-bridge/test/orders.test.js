import test from 'node:test';
import assert from 'node:assert/strict';
import {orderRequest,capacityProposal,capacityFromFiles,orderApprovalMessage} from '../src/orders.js';

test('links a customer order to its Switch group message and rejects agent text',()=>{
  const message={messageId:'m-1',senderId:'u-1',senderName:'Customer',senderType:'user',body:'I want 1000 cookies for Friday'};
  const order=orderRequest(message);
  assert.equal(order.quantity,1000);
  assert.equal(order.customerId,'u-1');
  assert.equal(order.messageId,'m-1');
  assert.equal(order.item,'cookies');
  assert.equal(orderRequest({...message,senderType:'agent'}),null);
  assert.equal(orderRequest({...message,body:'@Customer Your request for 10 cookies has been accepted by the business owner. Order reference: c68435a4-af04-4c34-9ab3-0b6bfae8c1f2.'}),null);
});

test('capacity uses selected CSV numbers and subtracts committed orders',()=>{
  const store={content:()=>({file:{name:'capacity.csv',version:2},rows:[['item','capacity','committed'],['cookies','1200','300']]})};
  const team={ownerId:'owner',workflow:{fileIds:['file-1']}};
  assert.deepEqual(capacityFromFiles(store,team,{item:'cookies',quantity:1000}),{
    status:'unfeasible',available:900,capacity:1200,committed:300,fileId:'file-1',version:2,row:1,column:2,
    evidence:'capacity.csv version 2: 1200 capacity - 300 committed = 900 available cookies.'
  });
  assert.equal(capacityFromFiles(store,team,{item:'cookies',quantity:800}).status,'feasible');
  assert.equal(capacityFromFiles(store,team,{item:'cookie',quantity:800}).status,'feasible');
});

test('capacity assessment must match the exact order and include evidence',()=>{
  const order={id:'order-1'};
  assert.deepEqual(capacityProposal('ORDER_CAPACITY: {"orderId":"order-1","status":"feasible","evidence":"Stock sheet: 1200 units"}',order),
    {status:'feasible',evidence:'Stock sheet: 1200 units',limitation:''});
  assert.throws(()=>capacityProposal('ORDER_CAPACITY: {"orderId":"other","status":"feasible","evidence":"guess"}',order));
  assert.throws(()=>capacityProposal('ORDER_CAPACITY: {"orderId":"order-1","status":"feasible","evidence":""}',order));
  assert.equal(capacityProposal('Evidence first. ORDER_CAPACITY: {"orderId":"order-1","status":"unknown","evidence":"1,070 remain","limitation":"Stock unverified"} **APPROVAL REQUIRED**',order).status,'unknown');
});

test('customer order message always asks the owner for an order decision',()=>{
  const order={id:'order-1',customerName:'Customer',quantity:10,item:'cookies',capacity:{evidence:'capacity.csv: 1070 recorded remaining.'}};
  const answer='ORDER_CAPACITY: {"orderId":"order-1","status":"unknown","evidence":"Recorded capacity only","limitation":"Stock unverified"}\nAPPROVAL REQUIRED — approve the checking action';
  const message=orderApprovalMessage(answer,order);
  assert.equal(capacityProposal(message,order).status,'unknown');
  assert.match(message,/Do you want to accept or decline this customer order\?/);
  assert.doesNotMatch(message,/approve the checking action/);
  assert.equal(capacityProposal(orderApprovalMessage('Malformed answer',order),order).status,'unknown');
});
