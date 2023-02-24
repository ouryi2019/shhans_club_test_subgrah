import { Log } from "../generated/schema";
import { Opened } from "../generated/Box/Box";

//开盲盒
export function handlerOpend(event: Opened): void {
  //日志记录
  let log = new Log(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  log.type = "102";
  log.timestamp = event.block.timestamp;
  log.account = event.params.account;
  log.param1 = event.params.collectionId.toString();
  log.address1 = event.params.collection;
  log.save();
}
