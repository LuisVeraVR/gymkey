import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('NotificationsGateway');

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempting connection without token`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token) as {
        sub?: string;
        tenantId?: string | null;
      };

      if (payload.sub) {
        await client.join(payload.sub);
        this.logger.log(
          `Client ${client.id} joined user room: ${payload.sub}`,
        );
      }

      if (payload.tenantId) {
        await client.join(payload.tenantId);
        this.logger.log(
          `Client ${client.id} joined tenant room: ${payload.tenantId}`,
        );
      } else if (!payload.sub) {
        this.logger.warn(
          `Client ${client.id} authenticated but has no sub/tenantId`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Connection auth failed for ${client.id}: ${e.message}`,
      );
      client.disconnect();
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket, payload: any): string {
    return 'pong';
  }

  sendToTenant(tenantId: string, event: string, data: any) {
    this.server.to(tenantId).emit(event, data);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(userId).emit(event, data);
  }
}
