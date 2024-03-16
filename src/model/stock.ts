import {
  BaseEntity,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["gid", "uin"], { unique: true })
class Stock extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "float", comment: "qq号" })
  uin: number;

  @Column({ type: "float", comment: "群号" })
  gid: number;

  @Column({ type: "json", comment: "股票", default: [] })
  stock: Array<{
    name: string;
    code: string;
    number: number;
    price: number;
  }>;
}

async function findOne(uin: number, gid: number) {
  return Stock.findOneBy({
    uin: uin,
    gid: gid,
  });
}

async function findOneByCode(uin: number, gid: number, code: string) {
  const userStock = await findOrAddOne(uin, gid);
  return userStock.stock.filter((stock) => stock.code === code)[0];
}

async function updateStock(
  uin: number,
  gid: number,
  code: string,
  stockName: string,
  stockNumber: number,
  stockPrice: number = 0
) {
  const userStock = await findOrAddOne(uin, gid);
  const existStock = userStock.stock.filter((stock) => stock.code === code);
  if (existStock.length === 0 && stockNumber > 0) {
    userStock.stock.push({
      name: stockName,
      code: code,
      number: stockNumber,
      price: stockPrice,
    });
    await userStock.save().catch((_) => undefined);
    return userStock;
  }
  for (const [index, stock] of userStock.stock.entries()) {
    //过滤非法数据
    if (
      stock.code !== code ||
      stockNumber === 0 ||
      (stockNumber < 0 && Math.abs(stockNumber) > stock.number)
    ) {
      continue;
    }
    //全卖
    if (stockNumber < 0 && Math.abs(stockNumber) === stock.number) {
      userStock.stock.splice(index, 1);
      continue;
    }
    //背包股票计数
    stock.number += stockNumber;
    //如果买股票，重新统计背包股票均价
    if (stockNumber > 0) {
      stock.price =
        (stockNumber * stockPrice + stock.number * stock.price) /
        (stockNumber + stock.number);
    }
  }
  await userStock.save().catch((_) => undefined);
  return userStock;
}

async function findOrAddOne(uin: number, gid: number) {
  const stock = await findOne(uin, gid);
  if (stock === null) {
    return add(uin, gid);
  }
  return stock;
}

async function add(uin: number, gid: number) {
  const stock = new Stock();
  stock.uin = uin;
  stock.gid = gid;
  await stock.save().catch((_) => undefined);
  return stock;
}

export { Stock, findOneByCode, findOrAddOne, updateStock };
