import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SorobanService } from './soroban.service';

describe('SorobanService', () => {
  function makeService() {
    const config = new ConfigService({
      ESCROW_CONTRACT_ID: 'CDA7WWR4AHSPQGIACBNCPG65DQZLPL3CV6NIABJFVLGPZVTUBIRQFNMF',
    });
    return new SorobanService(config);
  }

  // These validate before any RPC call is made, so they're testable
  // without a live Soroban network.

  it('rejects an unknown contract method', async () => {
    const service = makeService();

    await expect(
      service.buildContractCallXdr('not_a_real_method' as never, 'GSOURCE', []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing fee-paying source, even for a permissionless method', async () => {
    const service = makeService();

    await expect(
      service.buildContractCallXdr('resolve_dispute', '', [1]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an argument count mismatch', async () => {
    const service = makeService();

    await expect(
      service.buildContractCallXdr('deposit', 'GSOURCE', ['GSOURCE']), // deposit expects 2 args
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
