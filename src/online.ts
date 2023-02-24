import { BigInt, log } from "@graphprotocol/graph-ts";
import { Claimed, Online } from "../generated/Online/Online";
import { Log, OnlineRecord } from "../generated/schema";
import { getCardHistoryID } from "./cards";

//领取奖励 记录多人对战
export function handleClaimed(event: Claimed): void {
  let onlineRecord = OnlineRecord.load(event.params.playIndex.toString());
  if (!onlineRecord) {
    //没有已存在的数据，需要新增
    onlineRecord = new OnlineRecord(event.params.playIndex.toString());
    onlineRecord.playIndex = event.params.playIndex;
    let gamesIndex = BigInt.fromI32(event.params.playIndex.toI32() - 1);
    onlineRecord.gameIndex = gamesIndex;
    //访问合约
    let contract = Online.bind(event.address);
    let games = contract.try_games(gamesIndex);
    let result = contract.try_result(event.params.playIndex);
    if (!games.reverted && !result.reverted) {
      let winerTokens = contract.try_getUserTokens(result.value.value0);
      let loserTokens = contract.try_getUserTokens(result.value.value1);
      if (!winerTokens.reverted && !loserTokens.reverted) {
        //组合数据
        onlineRecord.player1 = games.value.value0;
        onlineRecord.player2 = games.value.value1;
        onlineRecord.timestamp = event.block.timestamp;
        onlineRecord.win = result.value.value0;
        onlineRecord.lose = result.value.value1;
        onlineRecord.player1Score = result.value.value2;
        onlineRecord.player2Score = result.value.value3;
        if (
          event.params.account.toHexString().toLowerCase() ==
          games.value.value0.toHexString().toLowerCase()
        ) {
          //player1领取奖励
          onlineRecord.player1Reward = event.params.reward;
          onlineRecord.player1RewardProps = event.params.rewardProps;
        } else {
          //plyaer2领取奖励
          onlineRecord.player2Reward = event.params.reward;
          onlineRecord.player2RewardProps = event.params.rewardProps;
        }
        if (result.value.value2.toI32() > result.value.value3.toI32()) {
          //player1胜利
          onlineRecord.player1Cards = winerTokens.value.map<string>((item) => {
            return getCardHistoryID(item);
          });
          onlineRecord.player2Cards = loserTokens.value.map<string>((item) => {
            return getCardHistoryID(item);
          });
        } else {
          //player2胜利
          onlineRecord.player2Cards = winerTokens.value.map<string>((item) => {
            return getCardHistoryID(item);
          });
          onlineRecord.player1Cards = loserTokens.value.map<string>((item) => {
            return getCardHistoryID(item);
          });
        }
        onlineRecord.save();
        //日志记录
        let logIns = new Log(
          event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
        );
        logIns.account = event.params.account;
        logIns.timestamp = event.block.timestamp;
        logIns.type = "101";
        logIns.address1 = games.value.value0;
        logIns.address2 = games.value.value1;
        logIns.address3 = result.value.value0;
        logIns.save();
      }
    }
  } else {
    //存在已有数据，仅需添加奖励即可
    //访问合约
    let contract = Online.bind(event.address);
    let games = contract.try_games(onlineRecord.gameIndex);
    let result = contract.try_result(onlineRecord.playIndex);
    if (!games.reverted && !result.reverted) {
      //组合数据
      if (
        event.params.account.toHexString().toLowerCase() ==
        games.value.value0.toHexString().toLowerCase()
      ) {
        //player1领取奖励
        onlineRecord.player1Reward = event.params.reward;
        onlineRecord.player1RewardProps = event.params.rewardProps;
      } else {
        //plyaer2领取奖励
        onlineRecord.player2Reward = event.params.reward;
        onlineRecord.player2RewardProps = event.params.rewardProps;
      }
      onlineRecord.save();
      //日志记录
      let logIns = new Log(
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
      );
      logIns.account = event.params.account;
      logIns.timestamp = event.block.timestamp;
      logIns.type = "101";
      logIns.address1 = games.value.value0;
      logIns.address2 = games.value.value1;
      logIns.address3 = result.value.value0;
      logIns.save();
    }
  }
}
