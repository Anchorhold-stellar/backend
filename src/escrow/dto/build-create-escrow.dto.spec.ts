import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuildCreateEscrowDto } from './build-create-escrow.dto';

describe('BuildCreateEscrowDto', () => {
  const base = {
    renterWallet: 'GRENTER',
    hostWallet: 'GHOST',
    assetAddress: 'GASSET',
  };

  it('accepts a well-formed milestone list', async () => {
    const dto = plainToInstance(BuildCreateEscrowDto, {
      ...base,
      milestones: [{ description: 'm1', amount: 100 }],
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a milestone missing amount', async () => {
    const dto = plainToInstance(BuildCreateEscrowDto, {
      ...base,
      milestones: [{ description: 'm1' }],
    });

    const errors = await validate(dto);
    expect(errors).not.toHaveLength(0);
  });

  it('rejects an empty milestones array', async () => {
    const dto = plainToInstance(BuildCreateEscrowDto, { ...base, milestones: [] });

    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'milestones')).toBe(true);
  });

  it('rejects a non-ISO8601 autoReleaseAt', async () => {
    const dto = plainToInstance(BuildCreateEscrowDto, {
      ...base,
      milestones: [{ description: 'm1', amount: 100, autoReleaseAt: 'not-a-date' }],
    });

    const errors = await validate(dto);
    expect(errors).not.toHaveLength(0);
  });
});
