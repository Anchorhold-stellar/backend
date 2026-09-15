import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddEvidenceDto {
  @IsString()
  @IsNotEmpty()
  submittedBy: string;

  @IsString()
  @IsNotEmpty()
  uri: string;

  @IsOptional()
  @IsString()
  note?: string;
}
