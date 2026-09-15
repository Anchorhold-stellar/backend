import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddEvidenceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  submittedBy: string;

  @ApiProperty({ description: 'IPFS/Arweave URI pointing to the evidence file' })
  @IsString()
  @IsNotEmpty()
  uri: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
