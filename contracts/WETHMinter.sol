interface IWETH {
    function deposit() external payable;
}

contract WETHMinter {
    function mint(address wethAddress) external payable {
        IWETH(wethAddress).deposit{value: msg.value}();
    }
}