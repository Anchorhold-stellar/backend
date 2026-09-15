import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { MilestoneInputDto } from './milestone-input.dto';

export class BuildCreateEscrowDto {
  @ApiProperty({ description: 'Fee-paying source account for the transaction' })
  @IsString()
  @IsNotEmpty()
  renterWallet: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hostWallet: string;

  @ApiProperty({ description: 'Stellar asset contract address held in escrow' })
  @IsString()
  @IsNotEmpty()
  assetAddress: string;

  @ApiProperty({ type: [MilestoneInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MilestoneInputDto)
  milestones: MilestoneInputDto[];
}
