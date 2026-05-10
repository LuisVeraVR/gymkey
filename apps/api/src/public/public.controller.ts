import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('gym/:slug')
  getGymBySlug(@Param('slug') slug: string) {
    return this.publicService.getGymPublicData(slug);
  }
}
