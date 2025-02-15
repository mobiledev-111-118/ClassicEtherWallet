const contract = require("../abiDefinitions/clo.json").find(
    i =>
        ethUtil.toChecksumAddress(i.address) ===
        ethUtil.toChecksumAddress("0x08A7c8be47773546DC5E173d67B0c38AfFfa4b84")
);

if (!contract) throw new Error("Unable to locate cold staking contract");

const addrs = {
    "Testnet CLO": "0xBD38997D00295D738BDC258DB4446577f4181Ed7",
    CLO: contract.address
};

const round_interval = {
    CLO: 2332800,
    "Testnet CLO": 3600
};

/*

// extending InitContract will  auto set view params

// but will need to update params

 */

const Contract = require("../contract").Contract;

class ColdStakingContract extends Contract {
    constructor(network = "CLO") {
        if (!round_interval[network]) {
            throw new Error("Invalid Request");
        }
        const { abi } = contract;

        const addr = addrs[network];

        super(abi, addr, network);
        this.staking_threshold = 0;

        this.round_interval = round_interval[network];

        this.networks = Object.keys(addrs);

        Promise.all([this.call("staking_threshold")]);
    }
}

const coldStakingV2Service = function(walletService) {
    this.tx = { gasLimit: 150000 };

    this.networks = Object.keys(addrs);

    this.validNetwork = () => this.networks.includes(ajaxReq.type);

    if (this.validNetwork()) {
        this.contract = new ColdStakingContract(ajaxReq.type);
    } else this.contract = new ColdStakingContract();

    this.stakingInfo = {
        time: 0,
        amount: 0,
        reward: 0
    };

    this.initStakerInfo = () => {
        this.stakingInfo = {
            time: 0,
            amount: 0,
            reward: 0
        };
    };

    /*

        Reset information and read from contract
     */

    this.handleInit = () => {
        if (!this.validNetwork()) {
            return;
        }

        this.initStakerInfo();
        this.contract = new ColdStakingContract(ajaxReq.type);
    };

    /*
        Gets the reward for address
     */

    /// UTILS

    this.userCanWithdraw = () => {
        if (!this.validNetwork()) return false;
        return this.getThresholdTime() < new Date().getTime();
    };

    this.validStakingTx = num_ => {
        if (!num_) {
            return false;
        }

        return new BigNumber(this.contract.staking_threshold).lte(num_);
    };

    this.getThresholdTime = () => {
        const {
            contract: { round_interval }
        } = this;

        return round_interval * 1000;
    };

    this.stakeReward = () => {
        if (
            !(
                walletService &&
                walletService.wallet &&
                walletService.wallet.getAddressString()
            )
        ) {
            return;
        }

        const func = this.contract.abi.find(i => i.name === "stake_reward");

        return this.contract
            .call(func, {
                inputs: [walletService.wallet.getAddressString()]
            })
            .then(result => {
                return new BigNumber(result.data[0]).toNumber();
            });
    };

    this.staker = () => {
        return Promise.all([this._staker(), this.stakeReward()])
            .then(result => {
                const [r1, reward] = result;

                const { time, amount } = r1;

                this.stakingInfo = {
                    time: new BigNumber(time).times(1000).toNumber(),
                    amount: new BigNumber(
                        etherUnits.toEther(amount, "wei")
                    ).toNumber(),
                    reward: new BigNumber(
                        etherUnits.toEther(reward, "wei")
                    ).toNumber()
                };

                return this.stakingInfo;
            })
            .catch(err => {
                return this.stakingInfo;
            });
    };

    this._staker = () => {
        if (
            !(
                walletService &&
                walletService.wallet &&
                walletService.wallet.getAddressString()
            )
        ) {
            return;
        }

        const func = this.contract.abi.find(i => i.name === "staker");

        return this.contract
            .call(func, {
                inputs: [walletService.wallet.getAddressString()]
            })
            .then(result => {
                const [amount, time] = result.data;

                return { amount, time };
            });
    };

    return this;
};

module.exports = coldStakingV2Service;
