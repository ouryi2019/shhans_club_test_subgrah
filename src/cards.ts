import { BigInt } from "@graphprotocol/graph-ts";
import { Minted, Cards, CharacterUpdated } from "../generated/Cards/Cards";
import { Card, CardHistory, Log } from "../generated/schema";

//nft创建
export function handleMinted(event: Minted): void {
  let card = new Card(event.params.tokenId.toString());
  card.tokenID = event.params.tokenId;
  card.position = event.params.position;
  card.attack = event.params.attack;
  card.defense = event.params.defense;
  card.physical = event.params.physical;
  card.luck = event.params.luck;
  card.looks = event.params.looks;
  card.totalPotential = event.params.totalPotential;
  card.version = BigInt.fromI32(0);
  let contract = Cards.bind(event.address);
  let result = contract.try_calculatePower(event.params.tokenId);
  if (!result.reverted) {
    card.stats = result.value.value4;
    card.save();
  }
}

//nft变动
export function handleCharacterUpdated(event: CharacterUpdated): void {
  let card = Card.load(event.params.tokenId.toString());
  if (card) {
    let contract = Cards.bind(event.address);
    let result = contract.try_calculatePower(event.params.tokenId);
    if (!result.reverted) {
      card.attack = result.value.value0;
      card.defense = result.value.value1;
      card.physical = result.value.value2;
      card.luck = result.value.value3;
      card.stats = result.value.value4;
      card.version = card.version.plus(BigInt.fromI32(1));
      card.save();
      //使用道具日志
      let log = new Log(
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
      );
      log.type = "105";
      log.timestamp = event.block.timestamp;
      log.account = event.params.account;
      log.param1 = event.params.tokenId.toString();
      log.param2 = event.params.prop.toString();
      log.param3 = event.params.amount.toString();
      log.save();
    }
  }
}

//获取nft快照id
export function getCardHistoryID(cardTokenID: BigInt): string {
  let card = Card.load(cardTokenID.toString());
  if (card) {
    let cardHistoryID = card.id + "-" + card.version.toString();
    let cardHistory = CardHistory.load(cardHistoryID);
    if (!cardHistory) {
      //创建快照
      let cardHistory = new CardHistory(cardHistoryID);
      cardHistory.tokenID = card.tokenID;
      cardHistory.position = card.position;
      cardHistory.attack = card.attack;
      cardHistory.defense = card.defense;
      cardHistory.physical = card.physical;
      cardHistory.luck = card.luck;
      cardHistory.stats = card.stats;
      cardHistory.looks = card.looks;
      cardHistory.totalPotential = card.totalPotential;
      cardHistory.version = card.version;
      cardHistory.save();
    }
    return cardHistoryID;
  } else {
    return cardTokenID.toString();
  }
}
