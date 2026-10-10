/**
 * Pluggable Adapter Interface for Loom / Finishing Machine IoT Defect Scanners
 *
 * This contract decouples the production system from specific hardware vendors
 * (e.g., optical line-scan cameras, ultrasonic yarn tension sensors, laser counters).
 */
export class IoTDefectScannerInterface {
  /**
   * Connect to the hardware scanner stream
   * @param {string} machineCode
   * @param {string} endpointUrl
   */
  async connectScanner(machineCode, endpointUrl) {
    throw new Error('Method connectScanner() must be implemented by adapter');
  }

  /**
   * Fetch current roll defect events detected by the scanner
   * @param {string} machineCode
   * @param {number} fromMeter
   * @param {number} toMeter
   * @returns {Promise<Array<{defectType: string, positionMeter: number, severity: string}>>}
   */
  async getDefectEvents(machineCode, fromMeter, toMeter) {
    throw new Error('Method getDefectEvents() must be implemented by adapter');
  }

  /**
   * Trigger calibration or zeroing of optical sensor
   * @param {string} machineCode
   */
  async calibrate(machineCode) {
    throw new Error('Method calibrate() must be implemented by adapter');
  }
}

/**
 * Default mock / simulated implementation for development and testing
 */
export class SimulatedIoTDefectScanner extends IoTDefectScannerInterface {
  async connectScanner(machineCode, endpointUrl) {
    return { status: 'CONNECTED', machineCode, endpointUrl, mode: 'SIMULATION' };
  }

  async getDefectEvents(machineCode, fromMeter, toMeter) {
    return [
      {
        defectType: 'Slub',
        positionMeter: Math.floor(fromMeter + (toMeter - fromMeter) * 0.35),
        severity: 'MINOR',
        sensorConfidence: 0.94,
      },
    ];
  }

  async calibrate(machineCode) {
    return { machineCode, calibratedAt: new Date().toISOString(), status: 'OK' };
  }
}

export const iotDefectScanner = new SimulatedIoTDefectScanner();

