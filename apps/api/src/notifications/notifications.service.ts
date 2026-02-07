import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  /**
   * Broadcast a notification to all connected clients
   * @param event The event name
   * @param data The data to send
   */
  broadcast(event: string, data: any) {
    this.notificationsGateway.server.emit(event, data);
  }

  /**
   * Send a notification to a specific room (e.g. tenant-specific)
   * @param room The room name (e.g. tenantId)
   * @param event The event name
   * @param data The data to send
   */
  notifyRoom(room: string, event: string, data: any) {
    this.notificationsGateway.server.to(room).emit(event, data);
  }
}
