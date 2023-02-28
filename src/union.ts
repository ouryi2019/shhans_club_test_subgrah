import {
  Created,
  Exited,
  Joined,
  MatchStarted,
  Played,
  Replaced,
  Signed,
  Staked,
  UnionOwnerUpdated,
  Withdrawn,
  Union as UnionBody,
  Eliminated,
} from "../generated/Union/Union";
import {
  Card,
  UnionMember,
  UnionCard,
  Union,
  UnionMatch,
  UnionSign,
  MatchStart,
  Log,
  UnionEliminate,
} from "../generated/schema";
import { getCardHistoryID } from "./cards";
import { BigInt, log, store } from "@graphprotocol/graph-ts";

//创建联盟
export function handleCreated(event: Created): void {
  //创建联盟
  let union = new Union(event.params.unionIndex.toString());
  union.unionIndex = event.params.unionIndex;
  union.account = event.params.account;
  union.position = event.params.position;
  union.name = event.params.name;
  union.data = event.params.data;
  union.save();
  //创建成员
  let unionMember = UnionMember.load(event.params.account.toHexString());
  if (unionMember) {
    unionMember.union = union.id;
  } else {
    unionMember = new UnionMember(event.params.account.toHexString());
    unionMember.account = event.params.account;
    unionMember.isLeader = true;
    unionMember.union = union.id;
  }
  unionMember.save();
  //日志记录
  let log = new Log(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  log.type = "201";
  log.timestamp = event.block.timestamp;
  log.account = event.params.account;
  log.param1 = event.params.unionIndex.toString();
  log.address1 = event.params.name;
  log.address2 = event.params.account;
  log.save();
}

//加入联盟
export function handleJoined(event: Joined): void {
  let union = Union.load(event.params.unionIndex.toString());
  if (union) {
    let unionMember = UnionMember.load(event.params.account.toHexString());
    if (unionMember) {
      unionMember.union = union.id;
    } else {
      unionMember = new UnionMember(event.params.account.toHexString());
      unionMember.account = event.params.account;
      unionMember.isLeader = false;
      unionMember.union = union.id;
    }
    unionMember.save();
    //日志记录
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "202";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.param1 = event.params.unionIndex.toString();
    log.address1 = event.params.account;
    log.save();
  }
}

//退出联盟
export function handleExited(event: Exited): void {
  let unionMember = UnionMember.load(event.params.account.toHexString());
  if (unionMember) {
    store.remove("UnionMember", unionMember.id);
    //日志记录
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "203";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.param1 = event.params.unionIndex.toString();
    log.address1 = event.params.account;
    log.save();
  }
}

/**转让会长 */
export function handleUnionOwnerUpdated(event: UnionOwnerUpdated): void {
  let oldUnionMember = UnionMember.load(
    event.params.previousValue.toHexString()
  );
  let newUnionMember = UnionMember.load(event.params.newValue.toHexString());
  if (oldUnionMember && newUnionMember) {
    oldUnionMember.isLeader = false;
    newUnionMember.isLeader = true;
    oldUnionMember.save();
    newUnionMember.save();
    //日志
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "209";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.param1 = event.params.unionIndex.toString();
    log.address1 = event.params.previousValue;
    log.address2 = event.params.newValue;
    log.save();
  }
}

//卡片质押到联盟
export function handleStaked(event: Staked): void {
  let unionMember = UnionMember.load(event.params.account.toHexString());
  let card = Card.load(event.params.tokenId.toString());
  if (unionMember && card) {
    let unionCard = new UnionCard(event.params.tokenId.toString());
    unionCard.card = card.id;
    unionCard.union = unionMember.union;
    unionCard.save();
    //联盟上卡日志
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "205";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.address1 = event.params.account;
    log.param1 = unionMember.union;
    log.param2 = card.id;
    log.save();
  }
}

//卡片从联盟卸下
export function handleWithdrawn(event: Withdrawn): void {
  let unionCard = UnionCard.load(event.params.tokenId.toString());
  if (unionCard) {
    //联盟卸卡日志
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "206";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.address1 = event.params.account;
    log.param1 = unionCard.union;
    log.param2 = unionCard.card;
    log.save();
    //卸卡
    store.remove("UnionCard", unionCard.id);
  }
}

//替换卡片
export function handleReplaced(event: Replaced): void {
  let unionMember = UnionMember.load(event.params.account.toHexString());
  let oldUnionCard = UnionCard.load(event.params.oldTokenId.toString());
  let newUnionCard = UnionCard.load(event.params.newTokenId.toString());
  let card = Card.load(event.params.newTokenId.toString());
  if (unionMember && oldUnionCard && !newUnionCard && card) {
    //替换卡片
    newUnionCard = new UnionCard(event.params.newTokenId.toString());
    newUnionCard.card = card.id;
    newUnionCard.union = unionMember.union;
    newUnionCard.save();
    //日志
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "207";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.address1 = event.params.account;
    log.param1 = unionMember.union;
    log.param2 = oldUnionCard.card;
    log.param3 = newUnionCard.card;
    log.save();
    //删除老卡片
    store.remove("UnionCard", oldUnionCard.id);
  }
}

//参加联盟赛
export function handlePlayed(event: Played): void {
  let unionMatch = new UnionMatch(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  unionMatch.season = event.params.season;
  unionMatch.round = event.params.round;
  unionMatch.timestamp = event.block.timestamp;
  unionMatch.union1 = event.params.union1.toString();
  unionMatch.union2 = event.params.union2.toString();
  unionMatch.union1Score = event.params.player1Score;
  unionMatch.union2Score = event.params.player2Score;
  //获取联盟卡片快照
  let union1 = Union.load(event.params.union1.toString());
  let union2 = Union.load(event.params.union2.toString());
  if (union1 && union2) {
    let events = [
      event,
      event,
      event,
      event,
      event,
      event,
      event,
      event,
      event,
      event,
      event,
    ];
    let union1Cards = events.map<string>((nowEvent, index) => {
      let contract = UnionBody.bind(nowEvent.address);
      let unionIndexM = nowEvent.params.union1.toI32() - 1;
      //union1的卡
      let data = contract.try_unionTokens(
        BigInt.fromI32(unionIndexM),
        BigInt.fromI32(index)
      );
      if (!data.reverted) {
        return getCardHistoryID(data.value.value1);
      } else {
        return "0";
      }
    });
    let union2Cards = events.map<string>((nowEvent, index) => {
      let contract = UnionBody.bind(nowEvent.address);
      let unionIndexM = nowEvent.params.union2.toI32() - 1;
      //union1的卡
      let data = contract.try_unionTokens(
        BigInt.fromI32(unionIndexM),
        BigInt.fromI32(index)
      );
      if (!data.reverted) {
        return getCardHistoryID(data.value.value1);
      } else {
        return "0";
      }
    });
    unionMatch.union1Cards = union1Cards;
    unionMatch.union2Cards = union2Cards;
    unionMatch.save();
    //日志
    let log1 = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log1.type = "208";
    log1.timestamp = event.block.timestamp;
    log1.account = union1.name;
    log1.param1 = union1.id;
    log1.address1 = union1.name;
    log1.save();
    let log2 = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log2.type = "208";
    log2.timestamp = event.block.timestamp;
    log2.account = union2.name;
    log2.param1 = union2.id;
    log2.address1 = union2.name;
    log2.save();
  }
}

/**联盟赛报名 */
export function handleSigned(event: Signed): void {
  let union = Union.load(event.params.unionIndex.toString());
  if (union) {
    let unionSign = new UnionSign(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    unionSign.matchIndex = event.params.matchIndex;
    unionSign.account = event.params.account;
    unionSign.union = union.id;
    unionSign.timestamp = event.block.timestamp;
    unionSign.save();
    //日志记录
    let log = new Log(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    );
    log.type = "204";
    log.timestamp = event.block.timestamp;
    log.account = event.params.account;
    log.param1 = event.params.unionIndex.toString();
    log.param2 = event.params.matchIndex.toString();
    log.save();
  }
}

/**开始赛季记录 */
export function handleMatchStarted(event: MatchStarted): void {
  let matchStart = new MatchStart(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  matchStart.timestamp = event.block.timestamp;
  matchStart.hash = event.transaction.hash.toHexString();
  matchStart.save();
}

/**联盟淘汰赛记录 */
export function handleEliminated(event: Eliminated): void {
  let unionEliminate = new UnionEliminate(event.params.season.toString());
  unionEliminate.season = event.params.season;
  unionEliminate.unions = event.params.unions.map<string>((item) =>
    item.toString()
  );
  unionEliminate.tops = event.params.tops.map<string>((item) =>
    item.toString()
  );
  unionEliminate.save();
}
