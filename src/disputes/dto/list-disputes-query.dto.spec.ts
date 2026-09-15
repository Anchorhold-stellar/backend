import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListDisputesQueryDto } from './list-disputes-query.dto';

describe('ListDisputesQueryDto', () => {
  it('parses "true" and "false" strings into real booleans', () => {
    expect(plainToInstance(ListDisputesQueryDto, { resolved: 'true' }).resolved).toBe(
      true,
    );
    expect(plainToInstance(ListDisputesQueryDto, { resolved: 'false' }).resolved).toBe(
      false,
    );
  });

  it('fails validation for a non-boolean string instead of silently defaulting to false', async () => {
    const dto = plainToInstance(ListDisputesQueryDto, { resolved: 'notabool' });
    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].property).toBe('resolved');
  });

  it('leaves resolved undefined when omitted', () => {
    const dto = plainToInstance(ListDisputesQueryDto, {});
    expect(dto.resolved).toBeUndefined();
  });
});
