/**
 * MIT License
 *
 * Copyright (C) 2023 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { TurboModule } from '@rnoh/react-native-openharmony/ts';
import type { TurboModuleContext } from '@rnoh/react-native-openharmony/ts';
import wifiManager from '@ohos.wifiManager';
import connection from '@ohos.net.connection'
import { radio } from '@kit.TelephonyKit';
import Logger from './Logger'

class NetInfoState {
  type?: string
  isConnected?: boolean
  isInternetReachable?: boolean
  isWifiEnabled?: boolean
  details?: object
}

class Details {
  isConnectionExpensive?: boolean
  ssid?: string
  bssid?: string
  strength?: number
  ipAddress?: string
  subnet?: string
  frequency?: number
  linkSpeed?: number
  rxLinkSpeed?: number
  txLinkSpeed?: number
  carrier?: string;
  cellularGeneration?:string | null;
}

export class NetInfoTurboModule extends TurboModule {
  private numberOfListeners: number = 0
  private netConnection: connection.NetConnection = null

  constructor(protected ctx: TurboModuleContext) {
    super(ctx);
    this.listenerRegister();
    Logger.info('NetInfoTurboModule constructor')
  }

  configure(config: Details): void {
    Logger.info('configure,' + JSON.stringify(config));
  }

  getCurrentState(requestedInterface?: string): Promise<NetInfoState> {
    Logger.info('getCurrentState,' + requestedInterface);
    // this.ctx.rnInstance.emitDeviceEvent('netInfo.networkStatusDidChange', {})
    return new Promise(async (resolve, reject) => {
      try {
        const events = await this.createConnectionEvent()
        Logger.info('events,' + JSON.stringify(events));
        resolve(events)
      } catch (e) {
        reject(e)
      }
    });
  }

  addListener(eventName: string): void {
    Logger.info('addListener,' + eventName);
    this.numberOfListeners = this.numberOfListeners + 1
  }

  removeListeners(count: number): void {
    Logger.info('removeListeners,' + count);
    this.numberOfListeners = this.numberOfListeners - 1
  }

  listenerRegister(): void {
    // 创建NetConnection对象
    this.netConnection = connection.createNetConnection()
    // 先使用register接口注册订阅事件
    this.netConnection.register((data) => {
      Logger.info('netConnection,' + JSON.stringify(data));
    })
    // 订阅网络可用事件
    this.netConnection.on('netAvailable', (data) => {
      Logger.info('netAvailable,' + JSON.stringify(data));
      this.listenerGetCurrentState()
    })
    // 订阅网络阻塞状态事件
    // this.netConnection.on('netBlockStatusChange', (data) => {
    //   Logger.info('netBlockStatusChange,' + JSON.stringify(data));
    // })
    // 订阅网络能力变化事件
    this.netConnection.on('netCapabilitiesChange', (data) => {
      Logger.info('netCapabilitiesChange,' + JSON.stringify(data));
      this.listenerGetCurrentState()
    })
    // 订阅网络连接信息变化事件
    // this.netConnection.on('netConnectionPropertiesChange', (data) => {
    //   Logger.info('netConnectionPropertiesChange,' + JSON.stringify(data));
    // })
    // 订阅网络丢失事件
    this.netConnection.on('netLost', (data) => {
      Logger.info('netLost,' + JSON.stringify(data))
      this.listenerGetCurrentState()
    })
    // 订阅网络不可用事件
    this.netConnection.on('netUnavailable', (data) => {
      Logger.info('netUnavailable,' + JSON.stringify(data))
      this.listenerGetCurrentState()
    })
  }

  listenerGetCurrentState(): void {
    if (this.numberOfListeners > 0) {
      this.createConnectionEvent()
          .then(data => {
            this.ctx.rnInstance.emitDeviceEvent('netInfo.networkStatusDidChange', data)
          })
    }
  }

  async createConnectionEvent(): Promise<NetInfoState> {
    //判断wifi使能
    const event: NetInfoState = {}
    try {
      event.isWifiEnabled = wifiManager.isWifiActive()
    } catch (error) {
      event.isWifiEnabled = null
      Logger.error("isWifiEnabled failed:" + JSON.stringify(error));
    }
    const netHandle = connection.getDefaultNetSync(); //使用同步方法获取默认激活的数据网络,网络ID，取值为0代表没有默认网络，其余取值必须大于等于100。
    //连接类型,连接状态信息
    if (netHandle.netId == 0) { //没有默认网络
      event.type = 'none' //连接类型
      event.isConnected = false //连接状态
    } else {
      event.isConnected = true //连接状态
      const netCapabilities = await connection.getNetCapabilities(netHandle)
      //连接类型
      if (netCapabilities.bearerTypes.length == 1) { //只有一个网络类型
        switch (netCapabilities.bearerTypes[0]) {
          case 0:
            event.type = 'cellular'
            break
          case 1:
            event.type = 'wifi'
            break
          case 3:
            event.type = 'ethernet'
            break
          case 4:
            event.type = 'vpn';
            break
          default:
            event.type = 'unknown'
            break
        }
      } //判断是否可访问internet
      event.isInternetReachable = netCapabilities.networkCap.indexOf(16) != -1
      // if (netCapabilities.networkCap.length == 1) {
      //    event.isInternetReachable = netCapabilities.networkCap[0] == 12
      // }
      event.details = await this.createDetails(event.type);
    }
    return event;
  }

  getNetworkType(cellularInfo: radio.SignalInformation){
    let networkType: string | null = null;
    switch (cellularInfo.signalType) {
      case 0:
        networkType =  null;
        break;
      case 1:
      case 2:
        networkType = '2g';
        break;
      case 3:
      case 4:
        networkType = '3g';
        break;
      case 5:
        networkType = '4g';
        break;
      case 6:
        networkType = '5g';
        break;
    }
    return networkType;
  }

  async createDetails(detailsInterface: string): Promise<Details> {
    const details: Details = {}
    switch (detailsInterface) {
      case 'cellular':
        const slotId = await radio.getPrimarySlotId();
        const cellularInfo = radio.getSignalInformationSync(slotId);
        const networkType = this.getNetworkType(cellularInfo[0]);
        details.cellularGeneration = networkType;
        const networkState = await radio.getNetworkState();
        details.carrier = networkState.longOperatorName;
        break
      case 'wifi':
        //wifi信息
        const linkedInfo = await wifiManager.getLinkedInfo()
        //ssid
        details.ssid = linkedInfo.ssid
        //bssid
        details.bssid = linkedInfo.bssid
        //信号强度 与安卓备注有区别
        details.strength = linkedInfo.rssi
        //ipAddress
        const ipInfo = wifiManager.getIpInfo();
        details.ipAddress = this.ipToString(ipInfo.ipAddress)
        //subnet 掩码
        details.subnet = this.ipToString(ipInfo.netmask)
        //frequency
        details.frequency = linkedInfo.frequency
        //linkSpeed
        details.linkSpeed = linkedInfo.linkSpeed
        //rxLinkSpeed
        details.rxLinkSpeed = linkedInfo.rxLinkSpeed;
        //txLinkSpeed
        details.txLinkSpeed = linkedInfo.linkSpeed
        break
    }
    //isConnectionExpensive
    details.isConnectionExpensive = await connection.isDefaultNetMetered()
    return details;
  }

  ipToString(ipI: number): string {
    return ((ipI >> 24) & 0xFF) + '.' + ((ipI >> 16) & 0xFF) + '.' + ((ipI >> 8) & 0xFF) + '.' + (ipI >> 0 & 0xFF)
  }
}
