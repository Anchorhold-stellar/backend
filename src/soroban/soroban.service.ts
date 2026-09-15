import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from '@stellar/stellar-sdk';
import { CONTRACT_METHODS, ContractMethodName, ScValType } from './method-schemas';

function toScVal(value: unknown, type: ScValType) {
  switch (type) {
    case 'address':
      return nativeToScVal(value, { type: 'address' });
    case 'u32':
      return nativeToScVal(value, { type: 'u32' });
    case 'bool':
      return nativeToScVal(value, { type: 'bool' });
    case 'string':
      return nativeToScVal(value, { type: 'string' });
    case 'raw':
      return nativeToScVal(value);
  }
}

/**
 * Builds unsigned transaction XDR that invokes methods on the escrow
 * contract. The frontend signs this with Freighter and submits it — the
 * backend never touches a private key.
 */
@Injectable()
export class SorobanService {
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly networkPassphrase: string;

  constructor(private readonly config: ConfigService) {
    this.server = new rpc.Server(
      this.config.get<string>('SOROBAN_RPC_URL') ?? 'https://soroban-testnet.stellar.org',
    );
    this.contract = new Contract(this.config.get<string>('ESCROW_CONTRACT_ID') ?? '');
    this.networkPassphrase =
      this.config.get<string>('SOROBAN_NETWORK_PASSPHRASE') ?? Networks.TESTNET;
  }

  /**
   * `source` is the fee-paying account for the transaction. Every Stellar
   * transaction requires one, even for contract methods that are
   * permissionless at the auth layer (see method-schemas.ts) — callers of
   * a permissionless method must still supply *some* funded account to pay
   * the fee, it just isn't passed to the contract as an auth argument.
   */
  async buildContractCallXdr(
    methodName: ContractMethodName,
    source: string,
    args: unknown[],
  ): Promise<string> {
    const schema = CONTRACT_METHODS[methodName];
    if (!schema) {
      throw new BadRequestException(`unknown contract method: ${methodName}`);
    }
    if (!source) {
      throw new BadRequestException(
        'a fee-paying source account is required to build a transaction',
      );
    }
    if (args.length !== schema.args.length) {
      throw new BadRequestException(
        `${methodName} expects ${schema.args.length} argument(s), got ${args.length}`,
      );
    }

    const account = await this.server.getAccount(source);
    const scArgs = args.map((value, i) => toScVal(value, schema.args[i]));

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(schema.method, ...scArgs))
      .setTimeout(60)
      .build();

    const prepared = await this.server.prepareTransaction(tx);
    return prepared.toXDR();
  }
}
