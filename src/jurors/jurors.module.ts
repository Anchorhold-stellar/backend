import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JurorsController } from './jurors.controller';
import { JurorsService } from './jurors.service';
import { JurorsRepository } from './jurors.repository';

@Module({
  imports: [AuthModule],
  controllers: [JurorsController],
  providers: [JurorsService, JurorsRepository],
  exports: [JurorsRepository],
})
export class JurorsModule {}
